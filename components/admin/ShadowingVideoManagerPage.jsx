"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { deleteAdminContent, listAdminContent } from "@/src/services/admin.service";
import ConfirmDialog from "@/components/feature/ConfirmDialog";
import { TableLoadingRow } from "@/components/LoadingState";

const PAGE_SIZE = 6;
const STATUS_LABEL = { published: "Xuất bản", draft: "Bản nháp" };

function formatAdminDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export default function ShadowingVideoManagerPage({ level, moduleKey = "video", basePath = "video" }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("");
    const [page, setPage] = useState(1);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteVideoId, setDeleteVideoId] = useState("");

    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();

    useEffect(() => {
        let isMounted = true;

        const loadVideos = async () => {
            setLoading(true);

            try {
                const data = await listAdminContent({ module: moduleKey });

                if (isMounted) {
                    setVideos((data.items || []).filter((item) => !item.level || String(item.level).toUpperCase() === displayLevel));
                }
            } catch (error) {
                if (isMounted) {
                    notify.error(error, "Không tải được danh sách video");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadVideos();

        return () => {
            isMounted = false;
        };
    }, [displayLevel, moduleKey]);

    const filteredVideos = useMemo(() => {
        const keyword = query.trim().toLowerCase();

        return videos.filter((video) => {
            const matchKeyword =
                String(video.title || "").toLowerCase().includes(keyword) ||
                String(video.youtubeVideoId || "").toLowerCase().includes(keyword);
            const matchStatus = statusFilter === "all" || video.status === statusFilter;
            const matchDate = !dateFilter || video.updatedAtISO === dateFilter;
            return matchKeyword && matchStatus && matchDate;
        });
    }, [dateFilter, query, statusFilter, videos]);

    const totalPages = Math.max(1, Math.ceil(filteredVideos.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedVideos = filteredVideos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const totalPublished = filteredVideos.filter((video) => video.status === "published").length;
    const totalDraft = filteredVideos.filter((video) => video.status === "draft").length;
    const themeClass = moduleKey === "video" ? "video-admin-theme" : "";

    const handleDeleteVideo = async (videoId) => {
        try {
            await deleteAdminContent(moduleKey, videoId);
            notify.success("Đã xóa video");
            setVideos((current) => current.filter((video) => video.id !== videoId));
        } catch (error) {
            notify.error(error, "Xóa video thất bại");
        } finally {
            setDeleteVideoId("");
        }
    };

    return (
        <section className={`admin-page-stack ${themeClass}`}>
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <h2>Video - {displayLevel}</h2>
                    <p className="small">Quản lý video đăng tải theo cấp độ, không phân loại video.</p>
                </div>
                <Link href={`/admin/${basePath}/${normalizedLevel}/create`} className="btn">
                    <Plus size={14} />
                    Tạo video
                </Link>
            </div>

            <div className="admin-summary-strip shadowing-summary-strip">
                <div className="admin-summary-card">
                    <strong>{filteredVideos.length}</strong>
                    <span>Tổng video</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{totalPublished}</strong>
                    <span>Xuất bản</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{totalDraft}</strong>
                    <span>Bản nháp</span>
                </div>
            </div>

            <div className="card admin-filters admin-filters-dense shadowing-filters">
                <label>
                    Tìm kiếm
                    <input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Tìm theo tiêu đề hoặc ID YouTube"
                    />
                </label>
                <label>
                    Trạng thái
                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="all">Tất cả</option>
                        <option value="published">Xuất bản</option>
                        <option value="draft">Bản nháp</option>
                    </select>
                </label>
                <label>
                    Ngày cập nhật
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(event) => {
                            setDateFilter(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
            </div>

            <div className="card admin-table-card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Thứ tự</th>
                            <th>Tiêu đề video</th>
                            <th>ID YouTube</th>
                            <th>Trạng thái</th>
                            <th>Cập nhật</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={6} message="Đang tải danh sách video..." />
                        ) : pagedVideos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="small">Không tìm thấy video.</td>
                            </tr>
                        ) : (
                            pagedVideos.map((video, index) => (
                                <tr key={video.id}>
                                    <td>{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                                    <td>{video.title || "-"}</td>
                                    <td>{video.youtubeVideoId || "-"}</td>
                                    <td>
                                        <span className={`status-pill ${video.status === "published" ? "published" : "draft"}`}>
                                            {STATUS_LABEL[video.status]}
                                        </span>
                                    </td>
                                    <td>{formatAdminDateTime(video.updatedAt)}</td>
                                    <td>
                                        <div className="admin-action-row">
                                            <Link
                                                className="admin-icon-btn"
                                                href={`/admin/${basePath}/${normalizedLevel}/${video.id}`}
                                                aria-label="Chi tiết"
                                                title="Chi tiết"
                                            >
                                                <SquarePen size={16} />
                                            </Link>
                                            <button
                                                type="button"
                                                className="admin-icon-btn danger"
                                                aria-label="Xóa"
                                                title="Xóa"
                                                onClick={() => setDeleteVideoId(video.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="admin-pagination">
                    <button
                        type="button"
                        className="admin-ghost-btn"
                        disabled={safePage <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                        Trước
                    </button>
                    <span className="small">Trang {safePage} / {totalPages}</span>
                    <button
                        type="button"
                        className="admin-ghost-btn"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                        Sau
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={Boolean(deleteVideoId)}
                title="Xóa video này?"
                description="Thao tác này sẽ xóa video khỏi danh sách và không thể hoàn tác."
                cancelLabel="Hủy"
                confirmLabel="Xóa"
                onClose={() => setDeleteVideoId("")}
                onConfirm={() => handleDeleteVideo(deleteVideoId)}
            />
        </section>
    );
}

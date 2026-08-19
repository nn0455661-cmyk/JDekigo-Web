"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { deleteAdminLesson, listAdminLessons } from "@/src/services/admin.service";
import { getModuleMeta } from "@/components/admin/adminConfig";
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

export default function AdminLevelListPage({ moduleKey, level }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("");
    const [page, setPage] = useState(1);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteLessonId, setDeleteLessonId] = useState("");

    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const moduleMeta = getModuleMeta(moduleKey);

    useEffect(() => {
        let isMounted = true;

        const loadLessons = async () => {
            setLoading(true);

            try {
                const data = await listAdminLessons({ module: moduleKey, level: normalizedLevel });

                if (isMounted) {
                    setLessons(data.items || []);
                }
            } catch (error) {
                if (isMounted) {
                    notify.error(error, "Không tải được danh sách bài học");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadLessons();

        return () => {
            isMounted = false;
        };
    }, [moduleKey, normalizedLevel]);

    const filteredLessons = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return lessons.filter((lesson) => {
            const matchKeyword =
                lesson.lessonTitle.toLowerCase().includes(keyword) ||
                String(lesson.lessonOrder).includes(keyword);
            const matchStatus = statusFilter === "all" || lesson.status === statusFilter;
            const matchDate = !dateFilter || lesson.updatedAtISO === dateFilter;
            return matchKeyword && matchStatus && matchDate;
        });
    }, [dateFilter, lessons, query, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedLessons = filteredLessons.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleFilterChange = (nextQuery, nextStatus) => {
        setQuery(nextQuery);
        setStatusFilter(nextStatus);
        setPage(1);
    };

    const handleDateFilterChange = (nextDate) => {
        setDateFilter(nextDate);
        setPage(1);
    };

    const handleDeleteLesson = async (lessonId) => {
        try {
            const result = await deleteAdminLesson(lessonId);
            notify.mediaCleanup("Đã xóa bài học", result?.mediaCleanup);
            setLessons((current) => current.filter((lesson) => lesson.id !== lessonId));
        } catch (error) {
            notify.error(error, "Xóa bài học thất bại");
        } finally {
            setDeleteLessonId("");
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <h2>{moduleMeta.label} - {displayLevel}</h2>
                </div>
                <Link href={`/admin/${moduleKey}/${normalizedLevel}/create`} className="btn">
                    <Plus size={14} />
                    Tạo bài học
                </Link>
            </div>

            <div className="admin-summary-strip">
                <div className="admin-summary-card">
                    <strong>{filteredLessons.length}</strong>
                    <span>Tổng bài học</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{filteredLessons.filter((lesson) => lesson.status === "published").length}</strong>
                    <span>Xuất bản</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{filteredLessons.filter((lesson) => lesson.status === "draft").length}</strong>
                    <span>Bản nháp</span>
                </div>
            </div>

            <div className="card admin-filters admin-filters-dense">
                <label>
                    Tìm kiếm
                    <input
                        value={query}
                        onChange={(event) => handleFilterChange(event.target.value, statusFilter)}
                        placeholder="Tìm theo tiêu đề hoặc số thứ tự"
                    />
                </label>
                <label>
                    Trạng thái
                    <select
                        value={statusFilter}
                        onChange={(event) => handleFilterChange(query, event.target.value)}
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
                        onChange={(event) => handleDateFilterChange(event.target.value)}
                    />
                </label>
            </div>

            <div className="card admin-table-card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Thứ tự</th>
                            <th>Tiêu đề bài học</th>
                            <th>Trạng thái</th>
                            <th>Cập nhật</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={5} message="Đang tải danh sách bài học..." />
                        ) : pagedLessons.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="small">Không tìm thấy bài học.</td>
                            </tr>
                        ) : (
                            pagedLessons.map((lesson, index) => (
                                <tr key={lesson.id}>
                                    <td>{(safePage - 1) * PAGE_SIZE + index + 1}</td>
                                    <td>{lesson.lessonTitle}</td>
                                    <td>
                                        <span className={`status-pill ${lesson.status === "published" ? "published" : "draft"}`}>
                                            {STATUS_LABEL[lesson.status]}
                                        </span>
                                    </td>
                                    <td>{formatAdminDateTime(lesson.updatedAt)}</td>
                                    <td>
                                        <div className="admin-action-row">
                                            <Link
                                                className="admin-icon-btn"
                                                href={`/admin/${moduleKey}/${normalizedLevel}/${lesson.id}`}
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
                                                onClick={() => setDeleteLessonId(lesson.id)}
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
                open={Boolean(deleteLessonId)}
                title="Xóa bài học này?"
                description="Bài học, nội dung liên quan và media R2 không còn được nơi khác sử dụng sẽ bị xóa vĩnh viễn."
                cancelLabel="Hủy"
                confirmLabel="Xóa"
                onClose={() => setDeleteLessonId("")}
                onConfirm={() => handleDeleteLesson(deleteLessonId)}
            />
        </section>
    );
}

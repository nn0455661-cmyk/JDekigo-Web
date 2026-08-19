"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Target, Trophy } from "lucide-react";
import { ADMIN_LEVELS, ADMIN_MODULES } from "@/components/admin/adminConfig";
import { TableLoadingRow } from "@/components/LoadingState";
import api from "@/src/lib/axios";
import notify from "@/src/lib/notifier";

const MODULE_LABELS = {
    vocabulary: "Từ vựng",
    kanji: "Kanji",
    grammar: "Ngữ pháp",
    reading: "Reading",
    "mock-test": "Mock test",
    mock_test: "Mock test",
};

function formatAdminDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatDuration(seconds) {
    const totalSeconds = Math.max(Number(seconds) || 0, 0);
    if (!totalSeconds) return "-";
    const minutes = Math.floor(totalSeconds / 60);
    const rest = totalSeconds % 60;
    if (!minutes) return `${rest}s`;
    return `${minutes}m ${rest}s`;
}

function moduleLabel(moduleKey) {
    return MODULE_LABELS[moduleKey] || ADMIN_MODULES.find((item) => item.key === moduleKey)?.label || moduleKey || "-";
}

function historyModuleLabel(item) {
    if (item?.module !== "mock-test") {
        return moduleLabel(item?.module);
    }

    if (item.mockTestType === "full") {
        return "Mock test - Kiểm tra tổng hợp";
    }

    if (item.mockTestType === "mini") {
        return "Mock test - Kiểm tra nhỏ";
    }

    return "Mock test - Chưa xác định";
}

export default function AdminUserStatisticsDetailPage({ userId }) {
    const [payload, setPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [module, setModule] = useState("");
    const [level, setLevel] = useState("");

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/statistics/users/${userId}/history`, {
                params: {
                    page,
                    limit: 20,
                    module,
                    level,
                },
            });

            if (res.data.success) {
                setPayload(res.data.data);
            } else {
                notify.error(res.data.error?.message || "Không thể tải thống kê.");
            }
        } catch (error) {
            notify.error(error.response?.data?.error?.message || error.message || "Đã xảy ra lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    }, [userId, page, module, level]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        setPage(1);
    }, [module, level]);

    const summary = payload?.summary || {};
    const overallSummary = payload?.overallSummary || summary;
    const histories = payload?.data || [];
    const user = payload?.user || {};
    const totalPages = payload?.totalPages || 1;

    const accuracyLabel = useMemo(() => `${overallSummary.percentage || 0}%`, [overallSummary.percentage]);

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Thống kê người học</p>
                    <h2>{user.name || user.email || "Chi tiết user"}</h2>
                    <p className="small">{user.email || ""}</p>
                </div>
                <Link href="/admin/statistics" className="admin-ghost-btn">
                    <ArrowLeft size={14} /> Quay lại
                </Link>
            </div>

            <div className="admin-summary-strip">
                <div className="admin-summary-card">
                    <strong>{accuracyLabel}</strong>
                    <span>{overallSummary.correct || 0}/{overallSummary.total || 0}</span>
                    <span>Tỷ lệ đúng tổng toàn bộ lịch sử</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{overallSummary.attempts || 0}</strong>
                    <span>Số lần làm bài</span>
                </div>
            </div>

            <div className="card admin-filters admin-filters-dense">
                <label>
                    Module
                    <select value={module} onChange={(event) => setModule(event.target.value)}>
                        <option value="">Tất cả</option>
                        <option value="vocabulary">Từ vựng</option>
                        <option value="kanji">Kanji</option>
                        <option value="grammar">Ngữ pháp</option>
                        <option value="reading">Reading</option>
                        <option value="mock-test">Mock test</option>
                    </select>
                </label>
                <label>
                    Level
                    <select value={level} onChange={(event) => setLevel(event.target.value)}>
                        <option value="">Tất cả</option>
                        {ADMIN_LEVELS.map((levelItem) => (
                            <option key={levelItem} value={levelItem}>{levelItem}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="card admin-table-card">
                <table className="table admin-data-table">
                    <thead>
                        <tr>
                            <th>Bài test</th>
                            <th>Module</th>
                            <th>Level</th>
                            <th>Kết quả</th>
                            <th>Độ chính xác</th>
                            <th>Thời gian</th>
                            <th>Ngày làm</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={7} message="Đang tải lịch sử làm bài..." />
                        ) : histories.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="small">User này chưa có lịch sử làm bài phù hợp bộ lọc.</td>
                            </tr>
                        ) : (
                            histories.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.testTitle || item.title || item.testId || "-"}</td>
                                    <td>{historyModuleLabel(item)}</td>
                                    <td>{item.level || "-"}</td>
                                    <td>
                                        <span className="status-pill published">
                                            <Trophy size={12} /> {item.correct || 0}/{item.total || 0}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="status-pill draft">
                                            <Target size={12} /> {item.percentage || 0}%
                                        </span>
                                    </td>
                                    <td>
                                        <span className="small" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                            <Clock3 size={13} /> {formatDuration(item.durationSeconds)}
                                        </span>
                                    </td>
                                    <td>{formatAdminDateTime(item.createdAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {!loading && totalPages > 0 ? (
                    <div className="admin-pagination">
                        <button type="button" className="admin-icon-btn" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Trang trước">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="small" style={{ fontWeight: 700 }}>Trang {page} / {totalPages}</span>
                        <button type="button" className="admin-icon-btn" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Trang sau">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

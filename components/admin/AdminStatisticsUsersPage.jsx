"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Search, Trophy } from "lucide-react";
import { TableLoadingRow } from "@/components/LoadingState";
import api from "@/src/lib/axios";
import notify from "@/src/lib/notifier";

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

const MODULE_LABELS = {
    vocabulary: "Từ vựng",
    kanji: "Kanji",
    grammar: "Ngữ pháp",
    reading: "Reading",
    "mock-test": "Mock test",
    mock_test: "Mock test",
    unknown: "Khác",
};

const MODULE_COLORS = {
    vocabulary: "#ff6b00",
    kanji: "#7c3aed",
    grammar: "#22c55e",
    reading: "#0ea5e9",
    "mock-test": "#f59e0b",
    mock_test: "#f59e0b",
    unknown: "#94a3b8",
};
const EMPTY_ARRAY = [];

function moduleLabel(moduleKey) {
    return MODULE_LABELS[moduleKey] || moduleKey || "Khác";
}

function moduleColor(moduleKey) {
    return MODULE_COLORS[moduleKey] || MODULE_COLORS.unknown;
}

function getVietnamTodayInputDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function getInitials(name = "", email = "") {
    const source = name.trim() || email.trim();
    if (!source) return "U";
    return source
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function getLastLoginAt(user) {
    return user?.lastLoginAt || "";
}

export default function AdminStatisticsUsersPage() {
    const [users, setUsers] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [topUsersLoading, setTopUsersLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [selectedDate, setSelectedDate] = useState(getVietnamTodayInputDate);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 450);

        return () => clearTimeout(handler);
    }, [search]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/admin/users", {
                params: {
                    page,
                    limit: 10,
                    search: debouncedSearch,
                    role: "user",
                },
            });

            if (res.data.success) {
                setUsers(res.data.data.users || []);
                setTotalPages(res.data.data.totalPages || 1);
                setTotalUsers(res.data.data.total || 0);
            } else {
                notify.error(res.data.error?.message || "Không thể tải danh sách tài khoản.");
            }
        } catch (error) {
            notify.error(error.response?.data?.error?.message || error.message || "Đã xảy ra lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    const fetchOverview = useCallback(async () => {
        try {
            setChartLoading(true);
            const res = await api.get("/api/admin/statistics/overview", {
                params: { date: selectedDate },
            });

            if (res.data.success) {
                setOverview(res.data.data || null);
            } else {
                notify.error(res.data.error?.message || "Không thể tải tổng quan thống kê.");
            }
        } catch (error) {
            notify.error(error.response?.data?.error?.message || error.message || "Đã xảy ra lỗi hệ thống.");
        } finally {
            setChartLoading(false);
            setTopUsersLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    const todayModules = overview?.today?.byModule || EMPTY_ARRAY;
    const todayUsers = overview?.today?.users || 0;
    const topUsers = overview?.topUsers || EMPTY_ARRAY;

    const pieBackground = useMemo(() => {
        if (!todayModules.length || !todayUsers) {
            return "conic-gradient(#f1e4d7 0deg 360deg)";
        }

        let cursor = 0;
        const segments = todayModules.map((item, index) => {
            const start = cursor;
            const size = (Number(item.users) || 0) / todayUsers * 360;
            cursor += size;
            return `${moduleColor(item.module)} ${start}deg ${cursor}deg`;
        });

        return `conic-gradient(${segments.join(", ")})`;
    }, [todayModules, todayUsers]);

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Quản lý hệ thống</p>
                    <h2>Thống kê</h2>
                    <p className="small">Chọn tài khoản user để xem toàn bộ lịch sử làm bài và tỷ lệ chính xác tổng.</p>
                </div>
            </div>

            <div className="admin-summary-strip">
                <div className="admin-summary-card">
                    <strong>{totalUsers}</strong>
                    <span>Tài khoản user</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{users.length}</strong>
                    <span>Đang hiển thị</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{page}/{totalPages}</strong>
                    <span>Trang hiện tại</span>
                </div>
            </div>

            <div className="admin-stat-insights-grid">
                <div className="card admin-insight-card admin-ranking-card">
                    <div className="admin-dash-panel-head">
                        <div>
                            <p className="admin-kicker">Xếp hạng</p>
                            <h3 className="admin-highlight-title">Top 5 người có tỷ lệ đúng cao nhất</h3>
                        </div>
                        <span className="admin-stat-icon">
                            <Trophy size={16} />
                        </span>
                    </div>

                    <div className="admin-top-accuracy-list">
                        {topUsersLoading ? (
                            <p className="small">Đang tải bảng xếp hạng...</p>
                        ) : topUsers.length ? (
                            topUsers.map((item, index) => (
                                <div className="admin-top-accuracy-row" key={item.userId || item.email}>
                                    <span className="admin-top-rank">{index + 1}</span>
                                    <span className="admin-student-avatar">{getInitials(item.name, item.email)}</span>
                                    <span className="admin-top-user">
                                        <strong>{item.name || item.email || "User"}</strong>
                                        <small>{item.email || "-"}</small>
                                    </span>
                                    <span className="admin-top-score">
                                        <strong>{item.percentage || 0}%</strong>
                                        <small>{item.attempts || 0} lượt</small>
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="small">Chưa có dữ liệu làm bài để xếp hạng.</p>
                        )}
                    </div>
                </div>

                <div className="card admin-insight-card">
                    <div className="admin-dash-panel-head">
                        <div>
                            <p className="admin-kicker">Hôm nay</p>
                            <h3>Số người kiểm tra</h3>
                        </div>
                        <label className="admin-date-picker">
                            <CalendarDays size={14} />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(event) => setSelectedDate(event.target.value || getVietnamTodayInputDate())}
                            />
                        </label>
                    </div>

                    <div className="admin-live-pie-wrap">
                        <div className="admin-live-pie" style={{ background: pieBackground }}>
                            <div className="admin-live-pie-inner">
                                <strong>{chartLoading ? "..." : todayUsers}</strong>
                                <span>người</span>
                            </div>
                        </div>
                    </div>

                    <div className="admin-live-pie-legend">
                        {chartLoading ? (
                            <span className="small">Đang tải thống kê hôm nay...</span>
                        ) : todayModules.length ? (
                            todayModules.map((item) => (
                                <span key={item.module}>
                                    <i style={{ background: moduleColor(item.module) }} />
                                    {moduleLabel(item.module)}: {item.users} người
                                </span>
                            ))
                        ) : (
                            <span className="small">Hôm nay chưa có lượt làm bài.</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="card admin-filters admin-filters-dense">
                <label>
                    Tìm kiếm
                    <span className="admin-topbar-search" style={{ maxWidth: "100%", marginTop: 6 }}>
                        <Search size={14} />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo email, tên..." />
                    </span>
                </label>
            </div>

            <div className="card admin-table-card">
                <table className="table admin-data-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Họ tên</th>
                            <th>SĐT</th>
                            <th>Đăng nhập gần nhất</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={5} message="Đang tải danh sách tài khoản..." />
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="small">Không tìm thấy tài khoản user nào.</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id}>
                                    <td>{user.email}</td>
                                    <td>{user.name || "-"}</td>
                                    <td>{user.phone || "-"}</td>
                                    <td>{formatAdminDateTime(getLastLoginAt(user))}</td>
                                    <td>
                                        <div className="admin-action-row">
                                            <Link className="admin-icon-btn" href={`/admin/statistics/${user._id}`} aria-label="Xem thống kê" title="Xem thống kê">
                                                <Eye size={16} />
                                            </Link>
                                        </div>
                                    </td>
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

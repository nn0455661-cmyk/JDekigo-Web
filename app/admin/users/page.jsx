"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, Eye, ChevronLeft, ChevronRight, User } from "lucide-react";
import UserDetailsModal from "@/components/admin/UserDetailsModal";
import notify from "@/src/lib/notifier";
import api from "@/src/lib/axios";
import { TableLoadingRow } from "@/components/LoadingState";

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when role changes
  useEffect(() => {
    setPage(1);
  }, [role]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/users", {
        params: {
          page,
          limit: 10,
          search: debouncedSearch,
          role: role === "all" ? "" : role,
        },
      });

      if (res.data.success) {
        setUsers(res.data.data.users);
        setTotalPages(res.data.data.totalPages);
        setTotalUsers(res.data.data.total);
      } else {
        notify.error(res.data.message || "Lỗi khi tải danh sách người dùng.");
      }
    } catch (error) {
      notify.error(error.response?.data?.message || error.message || "Đã xảy ra lỗi hệ thống.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <section className="admin-page-stack">
      <div className="page-header admin-glass admin-subhero">
        <div className="admin-subhero-copy">
          <p className="admin-kicker">Quản lý hệ thống</p>
          <h2>Tài khoản</h2>
          <p className="small">Quản lý và xem thông tin chi tiết tất cả tài khoản trong hệ thống.</p>
        </div>
      </div>

      <div className="admin-summary-strip">
        <div className="admin-summary-card">
          <strong>{totalUsers}</strong>
          <span>Tổng tài khoản</span>
        </div>
        <div className="admin-summary-card">
          <strong>{users.filter(u => u.role?.toLowerCase() === 'admin').length}</strong>
          <span>Admin (trang này)</span>
        </div>
        <div className="admin-summary-card">
          <strong>{users.filter(u => u.role?.toLowerCase() === 'user').length}</strong>
          <span>User (trang này)</span>
        </div>
      </div>

      <div className="card admin-filters admin-filters-dense">
        <label>
          Tìm kiếm
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo email, tên..."
          />
        </label>
        <label>
          Phân quyền
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="all">Tất cả</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>

      <div className="card admin-table-card">
        <table className="table admin-data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Họ tên</th>
              <th>SĐT</th>
              <th>Ngày tham gia</th>
              <th>Phân quyền</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingRow colSpan={6} message="Đang tải danh sách tài khoản..." />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="small">Không tìm thấy tài khoản nào.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  <td>{user.email}</td>
                  <td>{user.name || "-"}</td>
                  <td>{user.phone || "-"}</td>
                  <td>{formatAdminDateTime(user.createdAt)}</td>
                  <td>
                    <span className={`status-pill ${user.role?.toLowerCase() === "admin" ? "published" : "draft"}`}>
                      {user.role?.toLowerCase() === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-action-row">
                      <button
                        type="button"
                        className="admin-icon-btn"
                        aria-label="Chi tiết"
                        title="Chi tiết"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && totalPages > 0 && (
          <div style={{ padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--admin-border)" }}>
            <div className="small">
              Tổng số <strong>{totalUsers}</strong> tài khoản
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="admin-icon-btn"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="small" style={{ fontWeight: 700 }}>
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="admin-icon-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <UserDetailsModal
        user={selectedUser}
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={(updatedUser) => {
          setUsers(users.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
          setSelectedUser(updatedUser);
        }}
      />
    </section>
  );
}

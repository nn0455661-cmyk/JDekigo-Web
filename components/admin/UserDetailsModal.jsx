"use client";

import { useEffect, useState } from "react";
import { UserCircle, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import api from "@/src/lib/axios";
import notify from "@/src/lib/notifier";

export default function UserDetailsModal({ user, open, onClose, onUserUpdated }) {
    const { t } = useLanguage();
    const { user: currentUser } = useAuth();
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose?.();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, open]);

    const handleRoleChange = async (newRole) => {
        if (!user || user.role?.toLowerCase() === newRole) return;
        
        try {
            setUpdating(true);
            const res = await api.patch(`/api/admin/users/${user._id}/role`, { role: newRole });
            if (res.data.success) {
                notify.success("Đã cập nhật quyền thành công");
                onUserUpdated?.(res.data.data);
            } else {
                notify.error(res.data.error?.message || res.data.message || "Lỗi khi cập nhật quyền");
            }
        } catch (error) {
            notify.error(error);
        } finally {
            setUpdating(false);
        }
    };

    if (!open || !user) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(79,102,173,0.1)] text-[#44548b]">
                        <UserCircle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-xl font-black text-[var(--color-text)]">Chi tiết tài khoản</h3>
                                <p className="mt-1 text-sm text-[var(--color-text-soft)]">Thông tin đầy đủ của người dùng.</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                                aria-label="Đóng"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 text-sm text-[var(--color-text)]">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <span className="font-semibold text-[var(--color-text-soft)]">Email</span>
                        <span>{user.email || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <span className="font-semibold text-[var(--color-text-soft)]">Họ tên</span>
                        <span>{user.name || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <span className="font-semibold text-[var(--color-text-soft)]">Số điện thoại</span>
                        <span>{user.phone || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <span className="font-semibold text-[var(--color-text-soft)]">Phân quyền</span>
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                                user.role?.toLowerCase() === 'admin' ? 'bg-[#ff6b00] text-white' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-soft)]'
                            }`}>
                                {user.role?.toLowerCase() === 'admin' ? 'Admin' : 'User'}
                            </span>
                            <select
                                value={user.role?.toLowerCase() === 'admin' ? 'admin' : 'user'}
                                onChange={(e) => handleRoleChange(e.target.value)}
                                disabled={updating || currentUser?._id === user._id}
                                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs outline-none focus:border-[#ff6b00]"
                                title={currentUser?._id === user._id ? "Không thể tự thay đổi quyền của chính mình" : ""}
                            >
                                <option value="user">Chuyển thành User</option>
                                <option value="admin">Chuyển thành Admin</option>
                            </select>
                            {updating && <span className="text-xs text-[var(--color-text-soft)]">Đang cập nhật...</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <span className="font-semibold text-[var(--color-text-soft)]">Ngày tham gia</span>
                        <span>{new Date(user.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                        <span className="font-semibold text-[var(--color-text-soft)]">Avatar</span>
                        <span>
                            {user.avatar ? (
                                // Keep native img because legacy profiles may reference arbitrary external hosts.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatar} alt="Avatar" className="h-12 w-12 rounded-full object-cover border border-[var(--color-border)]" />
                            ) : (
                                "-"
                            )}
                        </span>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-5 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-border)]"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Home, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function getInitials(name, email) {
    const source = String(name || email || "A").trim();
    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0][0] || "A"}${parts[1][0] || ""}`.toUpperCase();
    }

    return source.charAt(0).toUpperCase() || "A";
}

export default function AdminTopbarUser() {
    const { user, logout } = useAuth();
    const menuRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    const displayName = user?.name?.trim() || user?.email || "Admin";
    const roleLabel = String(user?.role || "Admin");
    const avatarUrl = user?.avatar?.trim() || "";
    const initials = useMemo(() => getInitials(user?.name, user?.email), [user?.email, user?.name]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
    };

    return (
        <div className="admin-topbar-user-wrap" ref={menuRef}>
            <button
                type="button"
                className="admin-topbar-user"
                aria-label="User profile"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={displayName}
                        width={40}
                        height={40}
                        unoptimized
                        className="admin-topbar-avatar admin-topbar-avatar-image"
                    />
                ) : (
                    <span className="admin-topbar-avatar">{initials}</span>
                )}
                <span className="admin-topbar-meta">
                    <strong>{displayName}</strong>
                    <small>{roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}</small>
                </span>
                <ChevronDown size={14} className={`admin-topbar-caret ${isOpen ? "is-open" : ""}`} />
            </button>

            {isOpen ? (
                <div className="admin-topbar-dropdown" role="menu" aria-label="Account menu">
                    <p className="admin-topbar-dropdown-label">Tài khoản</p>
                    <div className="admin-topbar-dropdown-user">
                        <strong>{displayName}</strong>
                        <small>{roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}</small>
                    </div>
                    <Link href="/" className="admin-topbar-dropdown-home" role="menuitem" onClick={() => setIsOpen(false)}>
                        <Home size={14} />
                        Về trang home
                    </Link>
                    <button
                        type="button"
                        className="admin-topbar-dropdown-logout"
                        onClick={handleLogout}
                        role="menuitem"
                    >
                        <LogOut size={14} />
                        Đăng xuất
                    </button>
                </div>
            ) : null}
        </div>
    );
}
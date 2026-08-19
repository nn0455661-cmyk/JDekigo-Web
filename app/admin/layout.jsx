import React from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbarUser from "@/components/admin/AdminTopbarUser";
import RequireAdmin from "@/components/auth/RequireAdmin";
import { Bell, MessageSquare } from "lucide-react";
import "./admin.css";

export const metadata = {
  title: "Admin - J-Deki Go",
};

export default function AdminLayout({ children }) {
  return (
    <RequireAdmin loginMessage="Vui long dang nhap de vao trang quan tri." forbiddenMessage="Chi tai khoan admin moi duoc vao trang quan tri.">
      <div className="admin-root">
        <div className="admin-shell">
          <AdminSidebar />
          <main className="admin-main">
            <div className="admin-main-content">
              <header className="admin-topbar admin-topbar-no-search">
                <div className="admin-topbar-actions">
                  <button type="button" className="admin-topbar-icon-btn" aria-label="Notifications">
                    <Bell size={15} />
                  </button>
                  <button type="button" className="admin-topbar-icon-btn" aria-label="Messages">
                    <MessageSquare size={15} />
                  </button>

                  <AdminTopbarUser />
                </div>
              </header>

              <div className="admin-main-scroll">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
}

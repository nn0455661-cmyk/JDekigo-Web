"use client";

import { useState } from "react";
import AdminTestsLevelPage from "./AdminTestsLevelPage";
import AdminMiniTestGroupsPage from "./AdminMiniTestGroupsPage";

export default function AdminTestTabsPage({ level }) {
    const [activeTab, setActiveTab] = useState("full-tests");

    return (
        <section className="admin-page-stack" style={{ gap: 0 }}>
            <div className="admin-tabs" style={{ display: "flex", gap: "1rem", padding: "1rem 1.5rem", backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                <button
                    className={`btn ${activeTab === "full-tests" ? "primary" : "admin-ghost-btn"}`}
                    onClick={() => setActiveTab("full-tests")}
                >
                    Kiểm tra tổng hợp
                </button>
                <button
                    className={`btn ${activeTab === "mini-tests" ? "primary" : "admin-ghost-btn"}`}
                    onClick={() => setActiveTab("mini-tests")}
                >
                    Kiểm tra nhỏ (Nhóm)
                </button>
            </div>

            <div className="admin-tab-content">
                {activeTab === "full-tests" && (
                    <div style={{ marginTop: "-1rem" }}>
                        <AdminTestsLevelPage level={level} />
                    </div>
                )}
                {activeTab === "mini-tests" && (
                    <div style={{ marginTop: "-1rem" }}>
                        <AdminMiniTestGroupsPage level={level} />
                    </div>
                )}
            </div>
        </section>
    );
}

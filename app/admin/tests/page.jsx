import Link from "next/link";
import { Timer, ChevronRight } from "lucide-react";
import { ADMIN_LEVELS } from "@/components/admin/adminConfig";

export const metadata = {
    title: "Kiểm tra - Admin - J-Deki Go",
};

export default function TestsHomePage() {
    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Kiểm tra</p>
                    <h2>Chọn level</h2>
                    <p className="small">Vào danh sách kiểm tra theo từng level.</p>
                </div>
                <div className="admin-mini-note">
                    <span className="chip">JPD113</span>
                    <span className="chip">JPD123</span>
                </div>
            </div>

            <div className="card admin-table-card">
                <div className="admin-level-picker-grid">
                    {ADMIN_LEVELS.map((level) => {
                        const displayLevel = level.toUpperCase();

                        return (
                            <Link key={level} href={`/admin/tests/${level}`} className="admin-level-picker-card">
                                <span className="admin-level-picker-icon">
                                    <Timer size={16} />
                                </span>
                                <span className="admin-level-picker-copy">
                                    <strong>{displayLevel}</strong>
                                    <small>Mở danh sách kiểm tra</small>
                                </span>
                                <ChevronRight size={16} />
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

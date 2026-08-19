"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { createMiniTestGroup, deleteMiniTestGroup, listMiniTestGroups } from "@/src/services/admin.service";
import LoadingState from "@/components/LoadingState";

export default function AdminMiniTestGroupsPage({ level }) {
    const normalizedLevel = String(level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listMiniTestGroups({ level: displayLevel });
            setGroups(data?.items || []);
        } catch (error) {
            notify.error(error, "Không tải được danh sách kiểm tra nhỏ");
        } finally {
            setLoading(false);
        }
    }, [displayLevel]);

    useEffect(() => { void loadGroups(); }, [loadGroups]);

    const createGroup = async () => {
        const nextOrder = groups.length ? Math.max(...groups.map((item) => Number(item.order) || 0)) + 1 : 1;
        setCreating(true);
        try {
            await createMiniTestGroup({ title: `Kiểm tra nhỏ ${nextOrder}`, level: displayLevel, order: nextOrder, status: "published" });
            notify.success(`Đã tạo Kiểm tra nhỏ ${nextOrder}`);
            await loadGroups();
        } catch (error) {
            notify.error(error, "Tạo kiểm tra nhỏ thất bại");
        } finally {
            setCreating(false);
        }
    };

    const removeGroup = async (id) => {
        try {
            await deleteMiniTestGroup(id);
            setGroups((current) => current.filter((item) => item.id !== id));
            notify.success("Đã xóa kiểm tra nhỏ");
        } catch (error) {
            notify.error(error, "Chỉ có thể xóa nhóm sau khi đã xóa hết đề bên trong");
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy"><p className="admin-kicker">Quản lý kiểm tra</p><h2>Kiểm tra nhỏ - {displayLevel}</h2><p className="small">Tạo Kiểm tra nhỏ 1, 2, 3 rồi vào từng nhóm để quản lý các đề.</p></div>
                <div className="admin-action-row"><Link href={`/admin/tests/${normalizedLevel}/questions`} className="admin-ghost-btn">Ngân hàng câu hỏi kiểm tra</Link><button type="button" className="btn" onClick={createGroup} disabled={creating}><Plus size={14} />{creating ? "Đang tạo..." : "Tạo kiểm tra nhỏ"}</button></div>
            </div>
            <div className={`grid gap-3 ${groups.length === 1 ? "md:grid-cols-1" : groups.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {loading ? <LoadingState message="Đang tải kiểm tra nhỏ..." rows={2} compact /> : groups.length === 0 ? <p className="small">Chưa có kiểm tra nhỏ.</p> : groups.map((group) => {
                    const testCount = Number(group.testCount) || 0;
                    return (
                        <article key={group.id} className="card admin-form-card">
                            <div className="flex items-start justify-between gap-3"><div><p className="admin-kicker">Nhóm {group.order}</p><h3>{group.title}</h3><p className="small mt-2">{testCount} đề đang có</p></div><FileText size={22} /></div>
                            <div className="admin-form-actions mt-4"><button type="button" className="admin-icon-btn danger" title="Xóa nhóm" onClick={() => removeGroup(group.id)}><Trash2 size={16} /></button><Link href={`/admin/tests/${normalizedLevel}/groups/${group.id}`} className="btn">Quản lý đề</Link></div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { deleteAdminContent, listAdminContent } from "@/src/services/admin.service";
import ConfirmDialog from "@/components/feature/ConfirmDialog";
import { TableLoadingRow } from "@/components/LoadingState";

const PAGE_SIZE = 8;

export default function SpeakingManagerPage({ level }) {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState("");
    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();

    useEffect(() => {
        let mounted = true;
        const loadItems = async () => {
            setLoading(true);
            try {
                const data = await listAdminContent({ module: "speaking" });
                const next = (data.items || [])
                    .filter((item) => !item.level || String(item.level).toUpperCase() === displayLevel)
                    .sort((left, right) => (Number(left.setOrder) || 999) - (Number(right.setOrder) || 999));
                if (mounted) setItems(next);
            } catch (error) {
                if (mounted) notify.error(error, "Không tải được danh sách đề speaking");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadItems();
        return () => { mounted = false; };
    }, [displayLevel]);

    const filteredItems = useMemo(() => items.filter((item) => {
        const matchesQuery = String(item.title || "").toLowerCase().includes(query.trim().toLowerCase());
        return matchesQuery && (statusFilter === "all" || item.status === statusFilter);
    }), [items, query, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleDelete = async () => {
        try {
            const result = await deleteAdminContent("speaking", deleteId);
            setItems((current) => current.filter((item) => item.id !== deleteId));
            notify.mediaCleanup("Đã xóa đề", result?.mediaCleanup);
        } catch (error) {
            notify.error(error, "Xóa đề thất bại");
        } finally {
            setDeleteId("");
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <h2>Speaking - {displayLevel}</h2>
                    <p className="small">Quản lý danh sách đề; mỗi đề gồm phần nói và phần đọc.</p>
                </div>
                <Link href={`/admin/speaking/${normalizedLevel}/create`} className="btn"><Plus size={14} />Tạo đề</Link>
            </div>

            <div className="admin-summary-strip shadowing-summary-strip">
                <div className="admin-summary-card"><strong>{filteredItems.length}</strong><span>Tổng đề</span></div>
                <div className="admin-summary-card"><strong>{filteredItems.filter((item) => item.status === "published").length}</strong><span>Xuất bản</span></div>
                <div className="admin-summary-card"><strong>{filteredItems.filter((item) => item.status === "draft").length}</strong><span>Bản nháp</span></div>
            </div>

            <div className="card admin-filters admin-filters-dense">
                <label>Tìm kiếm<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo tên đề" /></label>
                <label>Trạng thái<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">Tất cả</option><option value="published">Xuất bản</option><option value="draft">Bản nháp</option></select></label>
            </div>

            <div className="card admin-table-card">
                <table className="table">
                    <thead><tr><th>Thứ tự</th><th>Tên đề</th><th>Phần nói</th><th>Phần đọc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        {loading ? <TableLoadingRow colSpan={6} message="Đang tải danh sách đề speaking..." /> : pagedItems.length === 0 ? <tr><td colSpan={6} className="small">Chưa có đề speaking.</td></tr> : pagedItems.map((item, index) => {
                            const speakingCount = Array.isArray(item.speakingItems) && item.speakingItems.length ? item.speakingItems.length : item.audioUrl ? 1 : 0;
                            const readingCount = Array.isArray(item.readingItems) ? item.readingItems.length : 0;
                            return (
                                <tr key={item.id}>
                                    <td>{item.setOrder || (safePage - 1) * PAGE_SIZE + index + 1}</td>
                                    <td>{item.title || `Đề ${index + 1}`}</td>
                                    <td>{speakingCount} bài</td>
                                    <td>{readingCount} bài</td>
                                    <td><span className={`status-pill ${item.status === "published" ? "published" : "draft"}`}>{item.status === "published" ? "Xuất bản" : "Bản nháp"}</span></td>
                                    <td><div className="admin-action-row"><Link className="admin-icon-btn" href={`/admin/speaking/${normalizedLevel}/${item.id}`} title="Chỉnh sửa"><SquarePen size={16} /></Link><button type="button" className="admin-icon-btn danger" onClick={() => setDeleteId(item.id)} title="Xóa"><Trash2 size={16} /></button></div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="admin-pagination"><button type="button" className="admin-ghost-btn" disabled={safePage <= 1} onClick={() => setPage((current) => current - 1)}>Trước</button><span className="small">Trang {safePage} / {totalPages}</span><button type="button" className="admin-ghost-btn" disabled={safePage >= totalPages} onClick={() => setPage((current) => current + 1)}>Sau</button></div>
            </div>

            <ConfirmDialog open={Boolean(deleteId)} title="Xóa đề speaking này?" description="Cả đề và media R2 không còn được nơi khác sử dụng sẽ bị xóa vĩnh viễn." cancelLabel="Hủy" confirmLabel="Xóa" onClose={() => setDeleteId("")} onConfirm={handleDelete} />
        </section>
    );
}

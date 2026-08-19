"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { deleteTest, listMiniTestGroups, listTests } from "@/src/services/admin.service";
import { TableLoadingRow } from "@/components/LoadingState";

export default function AdminMiniTestGroupDetailPage({ level, groupId }) {
    const normalizedLevel = String(level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const backHref = `/admin/tests/${normalizedLevel}`;
    const [group, setGroup] = useState(null);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            listMiniTestGroups({ level: displayLevel }),
            listTests({ level: displayLevel, module: "mock_test", testKind: "module_exam", miniTestGroupId: groupId }),
        ]).then(([groupData, testData]) => {
            if (!mounted) return;
            setGroup((groupData?.items || []).find((item) => item.id === groupId) || null);
            setTests(testData?.items || []);
        }).catch((error) => notify.error(error, "Không tải được danh sách đề")).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [displayLevel, groupId]);

    const removeTest = async (id) => {
        try {
            await deleteTest(id);
            setTests((current) => current.filter((item) => item.id !== id));
            notify.success("Đã xóa đề");
        } catch (error) {
            notify.error(error, "Xóa đề thất bại");
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy"><p className="admin-kicker">Kiểm tra nhỏ</p><h2>{group?.title || "Kiểm tra nhỏ"} - {displayLevel}</h2><p className="small">Mỗi đề gồm 15 đến 30 câu và có thời gian làm bài.</p></div>
                <div className="admin-action-row"><Link href={backHref} className="admin-ghost-btn"><ArrowLeft size={14} />Quay lại</Link><Link href={`/admin/tests/${normalizedLevel}/create?kind=module_exam&module=mock_test&groupId=${groupId}&backTo=${encodeURIComponent(`/admin/tests/${normalizedLevel}/groups/${groupId}`)}`} className="btn"><Plus size={14} />Tạo đề</Link></div>
            </div>
            <div className="card admin-table-card"><table className="table admin-data-table"><thead><tr><th>Tiêu đề</th><th>Thời gian</th><th>Số câu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
                {loading ? <TableLoadingRow colSpan={5} message="Đang tải danh sách đề..." /> : tests.length === 0 ? <tr><td colSpan={5}>Chưa có đề.</td></tr> : tests.map((item) => <tr key={item.id}><td>{item.testTitle}</td><td>{item.timeLimit} phút</td><td>{item.totalQuestions}</td><td>{item.status === "published" ? "Xuất bản" : "Bản nháp"}</td><td><div className="admin-action-row"><Link className="admin-icon-btn" href={`/admin/tests/${normalizedLevel}/${item.id}?groupId=${groupId}&backTo=${encodeURIComponent(`/admin/tests/${normalizedLevel}/groups/${groupId}`)}`}><SquarePen size={16} /></Link><button type="button" className="admin-icon-btn danger" onClick={() => removeTest(item.id)}><Trash2 size={16} /></button></div></td></tr>)}
            </tbody></table></div>
        </section>
    );
}

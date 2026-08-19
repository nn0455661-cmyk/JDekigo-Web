"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { deleteTest, listTests } from "@/src/services/admin.service";
import ConfirmDialog from "@/components/feature/ConfirmDialog";
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

export default function AdminTestsLevelPage({ level }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("");
    const [moduleFilter, setModuleFilter] = useState("mock_test");
    const [kindFilter, setKindFilter] = useState("module_exam");
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTestId, setDeleteTestId] = useState("");

    const STATUS_LABEL = { published: "Xuất bản", draft: "Bản nháp" };
    const MODULE_LABEL = {
        vocabulary: "Từ vựng",
        kanji: "Kanji",
        grammar: "Ngữ pháp",
        reading: "Luyện đọc",
        shadowing: "Luyện nói",
        mock_test: "Kiểm tra",
    };
    const KIND_LABEL = {
        lesson_test: "Bài tập theo bài học",
        mini_practice: "Bài kiểm tra theo mô-đun",
        module_exam: "Kiểm tra theo level",
    };
    const SCOPE_LABEL = {
        lesson: "Theo bài học",
        module: "Theo mô-đun",
        level: "Theo level",
    };

    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const testsBackHref = `/admin/tests/${normalizedLevel}`;

    useEffect(() => {
        let isMounted = true;

        const loadTests = async () => {
            setLoading(true);

            try {
                const params = {
                    level: displayLevel,
                    ...(moduleFilter !== "all" ? { module: moduleFilter } : {}),
                    ...(kindFilter !== "all" ? { testKind: kindFilter } : {}),
                };
                const data = await listTests(params);

                if (isMounted) {
                    setTests(data.items || []);
                }
            } catch (error) {
                if (isMounted) {
                    notify.error(error, "Không tải được danh sách bài kiểm tra");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadTests();

        return () => {
            isMounted = false;
        };
    }, [displayLevel, kindFilter, moduleFilter]);

    const filteredTests = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return tests.filter((testItem) => {
            if (testItem.miniTestGroupId) {
                return false;
            }

            const matchKeyword =
                testItem.testTitle.toLowerCase().includes(keyword) ||
                testItem.module.toLowerCase().includes(keyword);
            const matchStatus = statusFilter === "all" || testItem.status === statusFilter;
            const matchDate = !dateFilter || testItem.updatedAtISO === dateFilter;
            return matchKeyword && matchStatus && matchDate;
        });
    }, [dateFilter, query, statusFilter, tests]);

    const handleDeleteTest = async (testId) => {
        try {
            const result = await deleteTest(testId);
            notify.mediaCleanup("Đã xóa bài kiểm tra", result?.mediaCleanup);
            setTests((current) => current.filter((testItem) => testItem.id !== testId));
        } catch (error) {
            notify.error(error, "Xóa bài kiểm tra thất bại");
        } finally {
            setDeleteTestId("");
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Quản lý bài kiểm tra</p>
                    <h2>Bài kiểm tra - {displayLevel}</h2>
                    <p className="small">Hỗ trợ bài theo bài học, luyện tập và bài thi tổng.</p>
                    <div className="admin-subhero-pills">
                        <span className="chip">Theo mô-đun đã chọn</span>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/admin/tests/${normalizedLevel}/questions`} className="admin-ghost-btn">
                        Ngân hàng câu hỏi
                    </Link>
                    <Link href={`/admin/tests/${normalizedLevel}/create?module=mock_test&kind=module_exam`} className="btn">
                        <Plus size={14} />
                        Tạo đề mới
                    </Link>
                </div>
            </div>

            <div className="admin-summary-strip">
                <div className="admin-summary-card">
                    <strong>{filteredTests.length}</strong>
                    <span>Tổng bài kiểm tra</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{filteredTests.filter((item) => item.status === "published").length}</strong>
                    <span>Xuất bản</span>
                </div>
                <div className="admin-summary-card">
                    <strong>{filteredTests.length}</strong>
                    <span>Bài kiểm tra theo bộ lọc</span>
                </div>
            </div>

            <div className="card admin-filters admin-filters-dense">
                <label>
                    Tìm kiếm
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tìm theo tiêu đề hoặc mô-đun"
                    />
                </label>
                <label>
                    Trạng thái
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="all">Tất cả</option>
                        <option value="published">Xuất bản</option>
                        <option value="draft">Bản nháp</option>
                    </select>
                </label>
                <label>
                    Ngày cập nhật
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                    />
                </label>
            </div>

            <div className="card admin-table-card">
                <table className="table admin-data-table">
                    <thead>
                        <tr>
                            <th>Tiêu đề</th>
                            <th>Mô-đun</th>
                            <th>Loại</th>
                            <th>Phạm vi</th>
                            <th>Thời gian</th>
                            <th>Số câu</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableLoadingRow colSpan={8} message="Đang tải danh sách bài kiểm tra..." />
                        ) : filteredTests.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="small">Không tìm thấy bài kiểm tra.</td>
                            </tr>
                        ) : (
                            filteredTests.map((testItem) => (
                                <tr key={testItem.id}>
                                    <td>{testItem.testTitle}</td>
                                    <td>{MODULE_LABEL[testItem.module] || testItem.module}</td>
                                    <td>{KIND_LABEL[testItem.testKind] || testItem.testKind}</td>
                                    <td>{SCOPE_LABEL[testItem.scopeType] || testItem.scopeType}</td>
                                    <td>{formatAdminDateTime(testItem.updatedAt || testItem.timeLimit)}</td>
                                    <td>{testItem.totalQuestions}</td>
                                    <td>
                                        <span className={`status-pill ${testItem.status === "published" ? "published" : "draft"}`}>
                                            {STATUS_LABEL[testItem.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-action-row">
                                            <Link
                                                className="admin-icon-btn"
                                                href={`/admin/tests/${normalizedLevel}/${testItem.id}?backTo=${encodeURIComponent(testsBackHref)}`}
                                                aria-label="Chi tiết"
                                                title="Chi tiết"
                                            >
                                                <SquarePen size={16} />
                                            </Link>
                                            <button
                                                type="button"
                                                className="admin-icon-btn danger"
                                                aria-label="Xóa"
                                                title="Xóa"
                                                onClick={() => setDeleteTestId(testItem.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <ConfirmDialog
                    open={Boolean(deleteTestId)}
                    title="Xóa bài kiểm tra này?"
                    description="Bài kiểm tra và media R2 không còn được nơi khác sử dụng sẽ bị xóa vĩnh viễn."
                    cancelLabel="Hủy"
                    confirmLabel="Xóa"
                    onClose={() => setDeleteTestId("")}
                    onConfirm={() => handleDeleteTest(deleteTestId)}
                />
            </div>
        </section>
    );
}

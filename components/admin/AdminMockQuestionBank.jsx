"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, SquarePen, Trash2, Check, Circle } from "lucide-react";
import { listQuestions, createQuestion, updateQuestion, deleteQuestion, getMockTestConfig, updateMockTestConfig } from "@/src/services/admin.service";
import notify from "@/src/lib/notifier";
import LoadingState from "@/components/LoadingState";

export default function AdminMockQuestionBank({ level = "JPD113" }) {
    const normalizedLevel = String(level || "JPD113").toUpperCase();
    const questionTypeOptions = [
        { value: "multiple_choice", label: "Trắc nghiệm" },
        { value: "reading_comprehension", label: "Đọc hiểu" },
    ];
    const categoryOptions = [
        { value: "vocabulary", label: "Từ vựng" },
        { value: "kanji", label: "Kanji" },
        { value: "grammar", label: "Ngữ pháp" },
        { value: "reading", label: "Đọc hiểu" },
    ];
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [editingId, setEditingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [createForm, setCreateForm] = useState({
        type: "multiple_choice",
        category: "vocabulary",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        passage: "",
        subQuestions: [
            { question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
        ],
        module: "mock_test",
        level: normalizedLevel,
        status: "draft",
    });
    const [editForm, setEditForm] = useState(null);
    const [distribution, setDistribution] = useState({ vocabulary: 10, kanji: 8, grammar: 10, reading: 2 });
    const [timeLimit, setTimeLimit] = useState(30);
    const distributionTotal = Object.values(distribution).reduce((sum, count) => sum + Number(count || 0), 0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listQuestions({
                level: normalizedLevel,
                module: "mock_test",
                page,
                limit,
                ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
            });
            setItems(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            notify.error(error, "Không tải được danh sách câu hỏi");
        } finally {
            setLoading(false);
        }
    }, [normalizedLevel, page, limit, categoryFilter]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        getMockTestConfig(normalizedLevel)
            .then((data) => {
                setDistribution({ vocabulary: 10, kanji: 8, grammar: 10, reading: 2, ...(data.distribution || {}) });
                setTimeLimit(Math.max(1, Number(data.timeLimit || 30)));
            })
            .catch(() => {});
    }, [normalizedLevel]);

    const saveDistribution = async () => {
        if (distributionTotal !== 30) {
            notify.error(null, "Tổng số lượng phải đúng 30 câu");
            return;
        }
        try {
            const savedConfig = await updateMockTestConfig(normalizedLevel, distribution, timeLimit);
            setDistribution({ vocabulary: 10, kanji: 8, grammar: 10, reading: 2, ...(savedConfig.distribution || {}) });
            setTimeLimit(Math.max(1, Number(savedConfig.timeLimit || 30)));
            notify.success("Đã lưu cấu hình đề ngẫu nhiên");
        } catch (error) {
            notify.error(error, "Không lưu được cấu hình đề ngẫu nhiên");
        }
    };

    const handleCreateChange = (field, value) => setCreateForm((s) => ({ ...s, [field]: value }));
    const selectCreateCategory = (category) => setCreateForm((s) => ({
        ...s,
        category,
        type: category === "reading" ? "reading_comprehension" : (s.type === "reading_comprehension" ? "multiple_choice" : s.type),
    }));

    const handleCreateOptionChange = (idx, value) => setCreateForm((s) => {
        const options = Array.isArray(s.options) ? [...s.options] : ["", "", "", ""];
        options[idx] = value;
        return { ...s, options };
    });

    const handleCreateSubQuestionChange = (idx, field, value) => setCreateForm((s) => {
        const subQuestions = Array.isArray(s.subQuestions) && s.subQuestions.length
            ? s.subQuestions.map((q) => ({ ...q }))
            : [{ question: "", options: ["", "", "", ""], correctAnswer: "" }];

        subQuestions[idx] = { ...subQuestions[idx], [field]: value };
        return { ...s, subQuestions };
    });

    const handleCreateSubOptionChange = (qIdx, optIdx, value) => setCreateForm((s) => {
        const subQuestions = Array.isArray(s.subQuestions) && s.subQuestions.length
            ? s.subQuestions.map((q) => ({ ...q, options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""] }))
            : [{ question: "", options: ["", "", "", ""], correctAnswer: "" }];

        const next = subQuestions[qIdx] || { question: "", options: ["", "", "", ""], correctAnswer: "" };
        const options = Array.isArray(next.options) ? [...next.options] : ["", "", "", ""];
        options[optIdx] = value;
        subQuestions[qIdx] = { ...next, options };
        return { ...s, subQuestions };
    });

    const handleEditChange = (field, value) => setEditForm((s) => ({ ...s, [field]: value }));

    const handleEditOptionChange = (idx, value) => setEditForm((s) => {
        const options = Array.isArray(s.options) ? [...s.options] : ["", "", "", ""];
        options[idx] = value;
        return { ...s, options };
    });

    const handleEditSubQuestionChange = (idx, field, value) => setEditForm((s) => {
        if (!s) return s;
        const subQuestions = Array.isArray(s.subQuestions) && s.subQuestions.length
            ? s.subQuestions.map((q) => ({ ...q }))
            : [{ question: "", options: ["", "", "", ""], correctAnswer: "" }];

        subQuestions[idx] = { ...subQuestions[idx], [field]: value };
        return { ...s, subQuestions };
    });

    const handleEditSubOptionChange = (qIdx, optIdx, value) => setEditForm((s) => {
        if (!s) return s;
        const subQuestions = Array.isArray(s.subQuestions) && s.subQuestions.length
            ? s.subQuestions.map((q) => ({ ...q, options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""] }))
            : [{ question: "", options: ["", "", "", ""], correctAnswer: "" }];

        const next = subQuestions[qIdx] || { question: "", options: ["", "", "", ""], correctAnswer: "" };
        const options = Array.isArray(next.options) ? [...next.options] : ["", "", "", ""];
        options[optIdx] = value;
        subQuestions[qIdx] = { ...next, options };
        return { ...s, subQuestions };
    });

    const handleCreate = async () => {
        try {
            const payload = { ...createForm };
            payload.category = payload.type === "reading_comprehension" ? "reading" : payload.category;
            if (payload.type === "reading_comprehension") {
                payload.question = "";
                payload.options = [];
                payload.correctAnswer = "";
            }
            await createQuestion(payload);
            notify.success("Đã tạo câu hỏi");
            setCreateForm({
                type: "multiple_choice",
                category: "vocabulary",
                question: "",
                options: ["", "", "", ""],
                correctAnswer: "",
                explanation: "",
                passage: "",
                subQuestions: [
                    { question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
                ],
                module: "mock_test",
                level: normalizedLevel,
                status: "draft",
            });
            load();
        } catch (error) {
            notify.error(error, "Tạo câu hỏi thất bại");
        }
    };

    const handleSave = async (id) => {
        try {
            if (!editForm) return;
            const payload = { ...editForm };
            payload.category = payload.type === "reading_comprehension" ? "reading" : payload.category;
            if (payload.type === "reading_comprehension") {
                payload.question = "";
                payload.options = [];
                payload.correctAnswer = "";
            }
            await updateQuestion(id, payload);
            notify.success("Đã lưu");
            setEditingId(null);
            setExpandedId(null);
            setEditForm(null);
            load();
        } catch (error) {
            notify.error(error, "Lưu thất bại");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Xóa câu hỏi này?")) return;
        try {
            await deleteQuestion(id);
            notify.success("Đã xóa");
            load();
        } catch (error) {
            notify.error(error, "Xóa thất bại");
        }
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setExpandedId(item.id);
        setEditForm({
            type: item.type || "multiple_choice",
            category: item.category || (item.type === "reading_comprehension" ? "reading" : "vocabulary"),
            question: item.question || item.prompt || "",
            options: item.options || ["", "", "", ""],
            correctAnswer: item.correctAnswer || "",
            explanation: item.explanation || "",
            passage: item.passage || "",
            subQuestions: Array.isArray(item.subQuestions) && item.subQuestions.length
                ? item.subQuestions.map((subQuestion) => ({ ...subQuestion, explanation: subQuestion?.explanation || "" }))
                : [{ question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" }],
            module: item.module || "mock_test",
            level: item.level || normalizedLevel,
            status: item.status || "draft",
        });
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">NGÂN HÀNG CÂU HỎI</p>
                    <h2>Kiểm tra - {normalizedLevel}</h2>
                    <p className="small">Quản lý câu hỏi Kiểm tra theo level. Phân trang 10 câu mỗi trang.</p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link href={`/admin/tests/${String(normalizedLevel).toLowerCase()}`} className="admin-ghost-btn">
                        <ArrowLeft size={14} style={{ marginRight: 8 }} /> Quay lại
                    </Link>
                </div>
            </div>

            <div className="grid gap-4">
                <div className="card admin-form-card">
                    <div className="flex flex-wrap items-end gap-3">
                        {categoryOptions.map((option) => (
                            <label key={option.value} className="min-w-[130px] flex-1">
                                {option.label}{option.value === "reading" ? " (bài)" : ""}
                                <input type="number" min="0" value={distribution[option.value]} onChange={(event) => setDistribution((current) => ({ ...current, [option.value]: Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0) }))} />
                            </label>
                        ))}
                        <label className="min-w-[130px] flex-1">
                            Thời gian (phút)
                            <input type="number" min="1" value={timeLimit} onChange={(event) => setTimeLimit(Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1))} />
                        </label>
                        <div className="rounded-xl bg-[var(--color-bg-soft)] px-4 py-2"><span className="small">Tổng</span><strong className="ml-2 text-xl">{distributionTotal}</strong></div>
                        <button type="button" className="btn" onClick={saveDistribution}>Lưu cấu hình</button>
                    </div>
                </div>
                <div className="card admin-form-card">
                    <h3 className="mb-2">Tạo câu hỏi mới</h3>
                    <div className="mb-3" style={{ display: "grid", gap: 6 }}>
                        <span>Nhóm nội dung</span>
                        <div className="admin-tag-group" role="tablist" aria-label="Chọn nhóm nội dung">
                            {categoryOptions.map((option) => {
                                const active = createForm.category === option.value;
                                return (
                                    <button key={option.value} type="button" className={`admin-tag ${active ? "is-active" : ""}`} onClick={() => selectCreateCategory(option.value)}>
                                        <span className="admin-tag-icon" aria-hidden>{active ? <Check size={14} /> : <Circle size={14} />}</span>
                                        <span className="admin-tag-label">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mb-2" style={{ display: "grid", gap: 6 }}>
                        <span>Dạng câu hỏi</span>
                        <div className="admin-tag-group" role="tablist" aria-label="Chọn dạng câu hỏi">
                            {questionTypeOptions.map((option) => {
                                const active = createForm.type === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`admin-tag ${active ? "is-active" : ""}`}
                                        onClick={() => setCreateForm((s) => ({ ...s, type: option.value, category: option.value === "reading_comprehension" ? "reading" : (s.category === "reading" ? "vocabulary" : s.category) }))}
                                    >
                                        <span className="admin-tag-icon" aria-hidden>
                                            {active ? <Check size={14} /> : <Circle size={14} />}
                                        </span>
                                        <span className="admin-tag-label">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {createForm.type === "reading_comprehension" ? (
                        <>
                            <label style={{ display: "grid", gap: 6 }}>
                                Bài đọc
                                <textarea
                                    value={createForm.passage}
                                    onChange={(e) => handleCreateChange("passage", e.target.value)}
                                    placeholder="Nhập đoạn văn đọc hiểu"
                                    rows={6}
                                    style={{ resize: "vertical" }}
                                />
                            </label>

                            <div className="mt-3" style={{ display: "grid", gap: 12 }}>
                                {createForm.subQuestions.map((sub, qIdx) => (
                                    <div key={qIdx} className="card" style={{ padding: 12 }}>
                                        <label style={{ display: "grid", gap: 6 }}>
                                            Câu hỏi {qIdx + 1}
                                            <input
                                                type="text"
                                                value={sub.question || ""}
                                                onChange={(e) => handleCreateSubQuestionChange(qIdx, "question", e.target.value)}
                                                placeholder="Nhập câu hỏi"
                                            />
                                        </label>

                                        <div className="admin-choice-list mt-2">
                                            {(sub.options || ["", "", "", ""]).map((opt, idx) => (
                                                <label key={idx} className="admin-choice-row">
                                                    <span className="admin-choice-tag">{String.fromCharCode(65 + idx)}</span>
                                                    <input value={opt} onChange={(e) => handleCreateSubOptionChange(qIdx, idx, e.target.value)} placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`} />
                                                </label>
                                            ))}
                                        </div>

                                        <label className="mt-2">
                                            Đáp án đúng
                                            <select value={sub.correctAnswer || ""} onChange={(e) => handleCreateSubQuestionChange(qIdx, "correctAnswer", e.target.value)}>
                                                <option value="">Chọn đáp án</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                            </select>
                                        </label>

                                        <label className="mt-2" style={{ display: "grid", gap: 6 }}>
                                            Giải thích đáp án
                                            <textarea
                                                value={sub.explanation || ""}
                                                onChange={(e) => handleCreateSubQuestionChange(qIdx, "explanation", e.target.value)}
                                                placeholder="Giải thích vì sao đáp án này đúng..."
                                                rows={3}
                                            />
                                        </label>

                                        <div className="mt-2" style={{ display: "flex", gap: 8 }}>
                                            <button
                                                className="btn danger"
                                                type="button"
                                                onClick={() =>
                                                    setCreateForm((s) => ({
                                                        ...s,
                                                        subQuestions: s.subQuestions.filter((_, i) => i !== qIdx),
                                                    }))
                                                }
                                                disabled={createForm.subQuestions.length <= 1}
                                            >
                                                Xóa câu hỏi
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    className="btn"
                                    type="button"
                                    onClick={() =>
                                        setCreateForm((s) => ({
                                            ...s,
                                            subQuestions: [
                                                ...s.subQuestions,
                                                { question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
                                            ],
                                        }))
                                    }
                                >
                                    Thêm câu hỏi
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <textarea
                                    value={createForm.question}
                                    onChange={(e) => handleCreateChange("question", e.target.value)}
                                    placeholder="Tiêu đề / nội dung câu hỏi"
                                    rows={3}
                                    style={{ flex: 1, resize: "vertical" }}
                                />
                            </div>

                            <div className="admin-choice-list mt-3">
                                {createForm.options.map((opt, idx) => (
                                    <label key={idx} className="admin-choice-row">
                                        <span className="admin-choice-tag">{String.fromCharCode(65 + idx)}</span>
                                        <input value={opt} onChange={(e) => handleCreateOptionChange(idx, e.target.value)} placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`} />
                                    </label>
                                ))}
                            </div>

                            <label className="mt-2">
                                Đáp án đúng
                                <select value={createForm.correctAnswer} onChange={(e) => handleCreateChange("correctAnswer", e.target.value)}>
                                    <option value="">Chọn đáp án</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </label>

                            <label className="mt-2" style={{ display: "grid", gap: 6 }}>
                                Giải thích đáp án
                                <textarea
                                    value={createForm.explanation || ""}
                                    onChange={(e) => handleCreateChange("explanation", e.target.value)}
                                    placeholder="Giải thích vì sao đáp án này đúng..."
                                    rows={3}
                                />
                            </label>
                        </>
                    )}

                    <div className="mt-3" style={{ display: "flex", gap: 8 }}>
                        <button className="btn" onClick={handleCreate}><Plus size={14} style={{ marginRight: 8 }} />Tạo</button>
                        <button className="btn" onClick={() => {
                            setCreateForm({
                                type: "multiple_choice",
                                category: "vocabulary",
                                question: "",
                                options: ["", "", "", ""],
                                correctAnswer: "",
                                explanation: "",
                                passage: "",
                                subQuestions: [{ question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" }],
                                module: "mock_test",
                                level: normalizedLevel,
                                status: "draft",
                            });
                        }}>Làm lại</button>
                    </div>
                </div>

                <div className="card admin-form-card">
                    <div className="admin-question-bank-toolbar">
                        <div>
                            <h3>Danh sách câu hỏi</h3>
                            <p className="small">{total} kết quả</p>
                        </div>
                        <label>
                            Lọc theo nhóm
                            <select
                                value={categoryFilter}
                                onChange={(event) => {
                                    setCategoryFilter(event.target.value);
                                    setPage(1);
                                    setExpandedId(null);
                                    setEditingId(null);
                                }}
                            >
                                <option value="all">Tất cả nhóm</option>
                                {categoryOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    {loading ? <LoadingState message="Đang tải danh sách câu hỏi..." rows={2} compact /> : (
                        <>
                            <div style={{ display: "grid", gap: 8 }}>
                                {items.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-5 text-center text-sm text-[var(--color-text-soft)]">
                                        Không có câu hỏi trong nhóm này.
                                    </p>
                                ) : null}
                                {items.map((item) => {
                                    const isOpen = expandedId === item.id;
                                    const isReading = item.type === "reading_comprehension";
                                    const displayTitle = isReading
                                        ? `Đọc hiểu (${(item.subQuestions || []).length} câu)`
                                        : item.question || item.prompt || "(Không có nội dung)";
                                    const categoryLabel = categoryOptions.find((option) => option.value === (item.category || (isReading ? "reading" : "vocabulary")))?.label;
                                    return (
                                        <article key={item.id} className="card admin-question-card">
                                            <button type="button" className="admin-question-card-head" onClick={() => {
                                                if (isOpen) {
                                                    setExpandedId(null);
                                                    setEditingId(null);
                                                } else {
                                                    openEdit(item);
                                                }
                                            }}>
                                                <strong className="admin-question-title-ellipsis" title={displayTitle}>{displayTitle}</strong>
                                                <span className="chip admin-question-category-chip">{categoryLabel}</span>
                                                <span className="chip admin-question-id-chip">#{String(item.id).slice(-6)}</span>
                                            </button>

                                            {isOpen ? (
                                                <div className="p-3">
                                                    {editForm?.type === "reading_comprehension" ? (
                                                        <>
                                                            <label style={{ display: "grid", gap: 6 }}>
                                                                Bài đọc
                                                                <textarea
                                                                    value={editForm?.passage || ""}
                                                                    onChange={(e) => handleEditChange("passage", e.target.value)}
                                                                    rows={6}
                                                                    style={{ resize: "vertical" }}
                                                                />
                                                            </label>

                                                            <div className="mt-3" style={{ display: "grid", gap: 12 }}>
                                                                {(editForm?.subQuestions || []).map((sub, qIdx) => (
                                                                    <div key={qIdx} className="card" style={{ padding: 12 }}>
                                                                        <label style={{ display: "grid", gap: 6 }}>
                                                                            Câu hỏi {qIdx + 1}
                                                                            <input
                                                                                type="text"
                                                                                value={sub.question || ""}
                                                                                onChange={(e) => handleEditSubQuestionChange(qIdx, "question", e.target.value)}
                                                                            />
                                                                        </label>

                                                                        <div className="admin-choice-list mt-2">
                                                                            {(sub.options || ["", "", "", ""]).map((opt, idx) => (
                                                                                <label key={idx} className="admin-choice-row">
                                                                                    <span className="admin-choice-tag">{String.fromCharCode(65 + idx)}</span>
                                                                                    <input value={opt} onChange={(e) => handleEditSubOptionChange(qIdx, idx, e.target.value)} />
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                        <label className="mt-2">
                                                                            Đáp án đúng
                                                                            <select value={sub.correctAnswer || ""} onChange={(e) => handleEditSubQuestionChange(qIdx, "correctAnswer", e.target.value)}>
                                                                                <option value="">Chọn đáp án</option>
                                                                                <option value="A">A</option>
                                                                                <option value="B">B</option>
                                                                                <option value="C">C</option>
                                                                                <option value="D">D</option>
                                                                            </select>
                                                                        </label>
                                                                        <label className="mt-2" style={{ display: "grid", gap: 6 }}>
                                                                            Giải thích đáp án
                                                                            <textarea
                                                                                value={sub.explanation || ""}
                                                                                onChange={(e) => handleEditSubQuestionChange(qIdx, "explanation", e.target.value)}
                                                                                rows={3}
                                                                            />
                                                                        </label>
                                                                        <div className="mt-2" style={{ display: "flex", gap: 8 }}>
                                                                            <button
                                                                                className="btn danger"
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setEditForm((s) => ({
                                                                                        ...s,
                                                                                        subQuestions: s.subQuestions.filter((_, i) => i !== qIdx),
                                                                                    }))
                                                                                }
                                                                                disabled={(editForm?.subQuestions || []).length <= 1}
                                                                            >
                                                                                Xóa câu hỏi
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                <button
                                                                    className="btn"
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setEditForm((s) => ({
                                                                            ...s,
                                                                            subQuestions: [
                                                                                ...s.subQuestions,
                                                                                { question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" },
                                                                            ],
                                                                        }))
                                                                    }
                                                                >
                                                                    Thêm câu hỏi
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="mb-3" style={{ display: "grid", gap: 6 }}>
                                                                <span>Nhóm nội dung</span>
                                                                <div className="admin-tag-group">
                                                                    {categoryOptions.filter((option) => option.value !== "reading").map((option) => {
                                                                        const active = editForm?.category === option.value;
                                                                        return <button key={option.value} type="button" className={`admin-tag ${active ? "is-active" : ""}`} onClick={() => handleEditChange("category", option.value)}>{active ? <Check size={14} /> : <Circle size={14} />} {option.label}</button>;
                                                                    })}
                                                                </div>
                                                            </div>
                                                            <label>
                                                                Nội dung
                                                                <textarea
                                                                    value={editForm?.question || ""}
                                                                    onChange={(e) => handleEditChange("question", e.target.value)}
                                                                    rows={3}
                                                                    style={{ resize: "vertical" }}
                                                                />
                                                            </label>
                                                            <div className="admin-choice-list mt-2">
                                                                {(editForm?.options || ["", "", "", ""]).map((opt, idx) => (
                                                                    <label key={idx} className="admin-choice-row">
                                                                        <span className="admin-choice-tag">{String.fromCharCode(65 + idx)}</span>
                                                                        <input value={opt} onChange={(e) => handleEditOptionChange(idx, e.target.value)} />
                                                                    </label>
                                                                ))}
                                                            </div>
                                                            <label className="mt-2">
                                                                Đáp án đúng
                                                                <select value={editForm?.correctAnswer || ""} onChange={(e) => handleEditChange("correctAnswer", e.target.value)}>
                                                                    <option value="">Chọn đáp án</option>
                                                                    <option value="A">A</option>
                                                                    <option value="B">B</option>
                                                                    <option value="C">C</option>
                                                                    <option value="D">D</option>
                                                                </select>
                                                            </label>
                                                            <label className="mt-2" style={{ display: "grid", gap: 6 }}>
                                                                Giải thích đáp án
                                                                <textarea
                                                                    value={editForm?.explanation || ""}
                                                                    onChange={(e) => handleEditChange("explanation", e.target.value)}
                                                                    rows={3}
                                                                />
                                                            </label>
                                                        </>
                                                    )}

                                                    <div className="mt-3" style={{ display: "flex", gap: 8 }}>
                                                        <button className="btn" onClick={() => handleSave(item.id)}><Check size={14} style={{ marginRight: 6 }} />Lưu</button>
                                                        <button className="btn" onClick={() => { setExpandedId(null); setEditingId(null); }}>Hủy</button>
                                                        <button className="btn danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} style={{ marginRight: 6 }} />Xóa</button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="mt-3" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                                <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
                                <div>Trang {page} / {Math.max(1, Math.ceil(total / limit))}</div>
                                <button className="btn" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)}>Sau</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

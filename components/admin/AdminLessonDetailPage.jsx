"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus, RotateCcw, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { getContentColumns, getContentFields, getModuleMeta } from "@/components/admin/adminConfig";
import RubyText from "@/components/feature/RubyText";
import { TableLoadingRow } from "@/components/LoadingState";
import {
    createAdminContent,
    deleteAdminContent,
    deleteAdminImage,
    deleteTest,
    getAdminLesson,
    listAdminContent,
    listTests,
    updateAdminContent,
    updateAdminLesson,
    uploadAdminImage,
} from "@/src/services/admin.service";
import { readingFromInlineRubyText } from "@/utils/grammarQuestionBuilder";

const STATUS_LABEL = { published: "Xuất bản", draft: "Bản nháp" };
const KIND_LABEL = {
    lesson_test: "Bài tập",
    mini_practice: "Bài kiểm tra",
    module_exam: "Kiểm tra",
};

function buildInitialState(fields) {
    const seed = {};
    fields.forEach((field) => {
        seed[field.name] = field.defaultValue || "";
    });
    return seed;
}

function mapContentToRow(moduleKey, item) {
    if (moduleKey === "grammar") {
        return { col1: item.structure || "", col2: item.meaning || "", col3: item.usage || "" };
    }

    if (moduleKey === "kanji") {
        return { col1: item.kanji || "", col2: item.onyomi || "", col3: item.meaning || "" };
    }

    if (moduleKey === "reading") {
        return {
            col1: item.title || "",
            col2: `${String(item.content || "").length} ký tự`,
            col3: item.translation || String(item.content || "").slice(0, 24),
        };
    }

    if (moduleKey === "shadowing" || moduleKey === "video") {
        return {
            col1: item.title || "",
            col2: item.youtubeVideoId || "",
            col3: "",
        };
    }

    if (moduleKey === "speaking") {
        return {
            col1: item.title || "",
            col2: item.audioUrl || "",
            col3: item.script || "",
        };
    }

    return { col1: item.word || "", col2: item.reading || "", col3: item.meaning || "" };
}

function mapContentToForm(moduleKey, item) {
    if (moduleKey === "grammar") {
        const grammarExamples = Array.isArray(item.examples)
            ? Array.from(
                new Map(
                    item.examples
                        .map((example) => {
                            const jp = String(example?.jp || "").trim();
                            const vi = String(example?.vi || "").trim();
                            if (!jp && !vi) {
                                return null;
                            }
                            return [`${jp}|||${vi}`, { jp, vi }];
                        })
                        .filter(Boolean)
                ).values()
            )
            : [];

        return {
            structure: item.structure || "",
            meaning: item.meaning || "",
            usage: item.usage || "",
            notes: item.notes || "",
            tip: item.tip || "",
            examples: grammarExamples.map((example) => {
                if (!example.jp) {
                    return example.vi;
                }

                if (!example.vi || example.vi === example.jp) {
                    return example.jp;
                }

                return `${example.jp} → ${example.vi}`;
            }).join("\n"),
        };
    }

    if (moduleKey === "kanji") {
        return {
            kanji: item.kanji || "",
            reading: item.reading || "",
            hanviet: item.hanviet || "",
            onyomi: item.onyomi || "",
            kunyomi: item.kunyomi || "",
            meaning: item.meaning || "",
            example: item.example || "",
            drawingImage: item.drawingImage || "",
            illustrationImage: item.illustrationImage || "",
        };
    }

    if (moduleKey === "reading") {
        return {
            title: item.title || "",
            content: item.content || "",
            contentWithHiragana: item.contentWithHiragana || readingFromInlineRubyText(item.content || ""),
            romaji: item.romaji || "",
            translation: item.translation || "",
        };
    }

    if (moduleKey === "shadowing" || moduleKey === "video") {
        return {
            title: item.title || "",
            youtubeVideoId: item.youtubeVideoId || "",
        };
    }

    if (moduleKey === "speaking") {
        return {
            title: item.title || "",
            imageUrl: item.imageUrl || "",
            audioUrl: item.audioUrl || "",
            script: item.script || "",
        };
    }

    return {
        word: item.word || "",
        reading: item.reading || "",
        meaning: item.meaning || "",
        example: item.example || "",
        image: item.image || item.mediaUrl || item.illustrationImage || "",
    };
}

function buildContentPayload(moduleKey, lessonId, formState, status) {
    if (moduleKey === "grammar") {
        return {
            module: moduleKey,
            lessonId,
            status,
            structure: formState.structure,
            meaning: formState.meaning,
            usage: formState.usage,
            notes: formState.notes,
            tip: formState.tip,
            examples: formState.examples,
        };
    }

    if (moduleKey === "kanji") {
        return {
            module: moduleKey,
            lessonId,
            status,
            kanji: formState.kanji,
            reading: formState.reading,
            hanviet: formState.hanviet,
            onyomi: formState.onyomi,
            kunyomi: formState.kunyomi,
            meaning: formState.meaning,
            example: formState.example,
            illustrationImage: formState.illustrationImage,
            drawingImage: formState.drawingImage,
        };
    }

    if (moduleKey === "reading") {
        return {
            module: moduleKey,
            lessonId,
            status,
            title: formState.title,
            content: formState.content,
            contentWithHiragana: formState.contentWithHiragana || readingFromInlineRubyText(formState.content || ""),
            romaji: formState.romaji,
            translation: formState.translation,
        };
    }

    if (moduleKey === "shadowing" || moduleKey === "video") {
        return {
            module: moduleKey,
            lessonId,
            status,
            title: formState.title,
            youtubeVideoId: formState.youtubeVideoId,
        };
    }

    if (moduleKey === "speaking") {
        return {
            module: moduleKey,
            lessonId,
            status,
            title: formState.title,
            imageUrl: formState.imageUrl,
            audioUrl: formState.audioUrl,
            script: formState.script,
            scriptEnabled: true,
        };
    }

    return {
        module: moduleKey,
        lessonId,
        status,
        word: formState.word,
        reading: formState.reading,
        meaning: formState.meaning,
        example: formState.example,
        image: formState.image,
    };
}

export default function AdminLessonDetailPage({ moduleKey, level, lessonId }) {
    const [tab, setTab] = useState("content");
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessonOrder, setLessonOrder] = useState(1);
    const [status, setStatus] = useState("published");
    const [contentRows, setContentRows] = useState([]);
    const [tests, setTests] = useState([]);
    const [editingContentId, setEditingContentId] = useState("");
    const [formState, setFormState] = useState({});
    const [loadingLesson, setLoadingLesson] = useState(true);
    const [loadingContent, setLoadingContent] = useState(true);
    const [loadingTests, setLoadingTests] = useState(true);
    const [savingLesson, setSavingLesson] = useState(false);
    const [savingContent, setSavingContent] = useState(false);
    const [uploadingField, setUploadingField] = useState("");
    const [pendingUploadFields, setPendingUploadFields] = useState([]);
    const [previewByField, setPreviewByField] = useState({});
    const [showReadingPreview, setShowReadingPreview] = useState(false);
    const [showMeaningPreview, setShowMeaningPreview] = useState(false);
    const [showContentPreview, setShowContentPreview] = useState(false);
    const previewUrlsRef = useRef({});
    const fileInputsRef = useRef({});
    const pendingFilesRef = useRef({});

    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const moduleMeta = getModuleMeta(moduleKey);
    const fields = useMemo(() => getContentFields(moduleKey), [moduleKey]);
    const contentColumns = getContentColumns(moduleKey);
    const router = useRouter();
    // Back href should point to this lesson's detail page so returning from test editor goes back here
    const lessonBackHref = `/admin/${moduleKey}/${normalizedLevel}/${lessonId}`;
    const getContentTextareaRows = (field) => {
        if (moduleKey !== "reading" || field.type !== "textarea") {
            return 4;
        }

        return field.name === "content" ? 7 : 5;
    };

    useEffect(() => {
        setFormState(buildInitialState(fields));
        setEditingContentId("");
    }, [fields]);

    useEffect(() => {
        const current = previewUrlsRef.current;
        return () => {
            Object.values(current).forEach((url) => {
                if (typeof url === "string" && url.startsWith("blob:")) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);

    useEffect(() => {
        let active = true;

        const loadLesson = async () => {
            setLoadingLesson(true);

            try {
                const data = await getAdminLesson(lessonId);
                if (!active || !data.item) {
                    return;
                }

                setLessonTitle(data.item.lessonTitle || "");
                setLessonOrder(data.item.lessonOrder || 1);
                setStatus(data.item.status || "published");
            } catch (error) {
                notify.error(error, "Không tải được bài học");
            } finally {
                if (active) {
                    setLoadingLesson(false);
                }
            }
        };

        loadLesson();

        return () => {
            active = false;
        };
    }, [lessonId]);

    useEffect(() => {
        let active = true;

        const loadContent = async () => {
            setLoadingContent(true);

            try {
                const data = await listAdminContent({ module: moduleKey, lessonId });
                if (!active) {
                    return;
                }

                setContentRows(data.items || []);
            } catch (error) {
                notify.error(error, "Không tải được nội dung");
            } finally {
                if (active) {
                    setLoadingContent(false);
                }
            }
        };

        loadContent();

        return () => {
            active = false;
        };
    }, [lessonId, moduleKey]);

    useEffect(() => {
        let active = true;

        const loadTests = async () => {
            setLoadingTests(true);

            try {
                const data = await listTests({
                    level: displayLevel,
                    module: moduleKey,
                    testKind: "mini_practice",
                    lessonId,
                });
                const items = Array.isArray(data?.items) ? data.items : [];

                const mapped = items.map((t) => ({
                    id: String(t._id),
                    testTitle: t.testTitle,
                    module: t.module,
                    testKind: t.testKind,
                    scopeType: t.scopeType,
                    timeLimit: t.timeLimit,
                    status: t.status,
                    totalQuestions: Array.isArray(t.questions) ? t.questions.length : 0,
                }));

                if (active) setTests(mapped);
            } catch (error) {
                notify.error(error, "Không tải được bài kiểm tra");
            } finally {
                if (active) setLoadingTests(false);
            }
        };

        loadTests();

        return () => {
            active = false;
        };
    }, [displayLevel, lessonId, moduleKey]);

    const handleSaveLesson = async (event) => {
        event.preventDefault();

        try {
            setSavingLesson(true);
            await updateAdminLesson(lessonId, {
                lessonTitle: lessonTitle.trim(),
                lessonOrder,
                status,
                module: moduleKey,
                level: displayLevel,
            });
            notify.success("Đã lưu bài học");
            router.refresh?.();
        } catch (error) {
            notify.error(error, "Lưu bài học thất bại");
        } finally {
            setSavingLesson(false);
        }
    };

    const setFieldValue = (fieldName, fieldValue) => {
        setFormState((current) => ({ ...current, [fieldName]: fieldValue }));
    };

    const markUploadPending = (fieldName, file) => {
        pendingFilesRef.current[fieldName] = file;
        setPendingUploadFields((current) => (current.includes(fieldName) ? current : [...current, fieldName]));
    };

    const clearUploadPending = (fieldName) => {
        delete pendingFilesRef.current[fieldName];
        setPendingUploadFields((current) => current.filter((item) => item !== fieldName));
    };

    const setPreviewValue = (fieldName, nextPreviewUrl) => {
        const previousPreviewUrl = previewUrlsRef.current[fieldName];

        if (previousPreviewUrl && previousPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previousPreviewUrl);
        }

        if (nextPreviewUrl) {
            previewUrlsRef.current[fieldName] = nextPreviewUrl;
        } else {
            delete previewUrlsRef.current[fieldName];
        }

        setPreviewByField((current) => ({
            ...current,
            [fieldName]: nextPreviewUrl || "",
        }));
    };

    const clearAllPreviews = () => {
        try {
            Object.values(previewUrlsRef.current).forEach((url) => {
                if (typeof url === "string" && url.startsWith("blob:")) {
                    try {
                        URL.revokeObjectURL(url);
                    } catch (e) {
                        // ignore
                    }
                }
            });
        } finally {
            previewUrlsRef.current = {};
            pendingFilesRef.current = {};
            setPreviewByField({});
            setPendingUploadFields([]);
            // clear file input elements too
            try {
                Object.values(fileInputsRef.current || {}).forEach((el) => {
                    try {
                        if (el && typeof el.value !== "undefined") el.value = "";
                    } catch (e) {
                        // ignore
                    }
                });
            } catch (e) {
                // ignore
            }
        }
    };

    const resetContentForm = () => {
        clearAllPreviews();
        setEditingContentId("");
        setFormState(buildInitialState(fields));
        setShowReadingPreview(false);
        setShowMeaningPreview(false);
        setShowContentPreview(false);
    };

    const isGifUrl = (url) => {
        if (!url) return false;
        const lower = String(url).toLowerCase();
        return lower.endsWith(".gif") || lower.startsWith("data:image/gif");
    };

    const handleClearFileField = (fieldName) => {
        setFieldValue(fieldName, "");
        setPreviewValue(fieldName, "");
        clearUploadPending(fieldName);
        const el = fileInputsRef.current && fileInputsRef.current[fieldName];
        if (el && typeof el.value !== "undefined") el.value = "";
    };

    const handleFileUpload = (fieldName, file) => {
        if (!file) return;
        const localPreviewUrl = URL.createObjectURL(file);
        markUploadPending(fieldName, file);
        setPreviewValue(fieldName, localPreviewUrl);
    };

    const handleSubmitContent = async (event) => {
        event.preventDefault();

        if (uploadingField) {
            notify.error(null, "Vui lòng chờ ảnh tải lên thành công trước khi lưu nội dung");
            return;
        }

        const stagedImageUrls = [];
        try {
            setSavingContent(true);
            const nextFormState = { ...formState };

            for (const fieldName of pendingUploadFields) {
                const file = pendingFilesRef.current[fieldName];
                if (!file) continue;

                setUploadingField(fieldName);
                const result = await uploadAdminImage(file);
                const uploadedUrl = result?.data?.url || result?.url || "";
                if (!uploadedUrl) throw new Error("Không nhận được URL ảnh sau khi tải lên.");

                nextFormState[fieldName] = uploadedUrl;
                stagedImageUrls.push(uploadedUrl);
            }

            const payload = buildContentPayload(moduleKey, lessonId, nextFormState, status);

            if (editingContentId) {
                await updateAdminContent(moduleKey, editingContentId, payload);
                notify.success("Đã cập nhật nội dung");
            } else {
                await createAdminContent(payload);
                notify.success("Đã thêm nội dung");
            }

            const data = await listAdminContent({ module: moduleKey, lessonId });
            setContentRows(data.items || []);
            resetContentForm();
        } catch (error) {
            await Promise.allSettled(stagedImageUrls.map((url) => deleteAdminImage(url)));
            notify.error(error, "Lưu nội dung thất bại");
        } finally {
            setUploadingField("");
            setSavingContent(false);
        }
    };

    const handleEditContent = (item) => {
        // Clear previous previews when switching to edit mode
        clearAllPreviews();
        // clear any selected file inputs when loading existing item
        try {
            Object.values(fileInputsRef.current || {}).forEach((el) => {
                try {
                    if (el && typeof el.value !== "undefined") el.value = "";
                } catch (e) {
                    // ignore
                }
            });
        } catch (e) {
            // ignore
        }
        setEditingContentId(item.id);
        setFormState(mapContentToForm(moduleKey, item));
        setTab("content");
    };

    const handleDeleteContent = async (itemId) => {
        if (!window.confirm("Xóa nội dung này và media R2 không còn được sử dụng?")) {
            return;
        }

        try {
            const result = await deleteAdminContent(moduleKey, itemId);
            notify.mediaCleanup("Đã xóa nội dung", result?.mediaCleanup);
            setContentRows((current) => current.filter((row) => row.id !== itemId));
        } catch (error) {
            notify.error(error, "Xóa nội dung thất bại");
        }
    };

    const handleDeleteTest = async (testIdValue) => {
        if (!window.confirm("Xóa bài kiểm tra này và media R2 không còn được sử dụng?")) {
            return;
        }

        try {
            const result = await deleteTest(testIdValue);
            notify.mediaCleanup("Đã xóa bài kiểm tra", result?.mediaCleanup);
            setTests((current) => current.filter((testItem) => testItem.id !== testIdValue));
        } catch {
            notify.error(null, "Xóa bài kiểm tra thất bại");
        }
    };

    const renderTestRows = () => {
        return tests.map((testItem) => (
            <tr key={testItem.id}>
                <td>{testItem.testTitle}</td>
                <td>{KIND_LABEL[testItem.testKind] || testItem.testKind}</td>
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
                            href={`/admin/tests/${normalizedLevel}/${testItem.id}?module=${encodeURIComponent(testItem.module || '')}&lessonId=${encodeURIComponent(testItem.lessonId || '')}&kind=${encodeURIComponent(testItem.testKind || '')}&backTo=${encodeURIComponent(lessonBackHref)}`}
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
                            onClick={() => handleDeleteTest(testItem.id)}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
            </tr>
        ));
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Chi tiết bài học</p>
                    <h2>{lessonTitle || "Đang tải tên bài học..."}</h2>
                    <p className="small">
                        {moduleMeta.label} - {displayLevel}
                    </p>
                    <p className="small">Quản lý nội dung, bài học và bài kiểm tra theo bài học.</p>
                    <div className="admin-subhero-pills">
                        <span className="chip">Nội dung</span>
                        <span className="chip">Bài kiểm tra</span>
                        <span className="chip">Trạng thái</span>
                    </div>
                </div>
                <div className="admin-header-actions">
                    <select value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="draft">Bản nháp</option>
                        <option value="published">Xuất bản</option>
                    </select>
                    <Link href={`/admin/${moduleKey}/${normalizedLevel}`} className="admin-ghost-btn">
                        <ArrowLeft size={14} />
                        Quay lại
                    </Link>
                </div>
            </div>

            <div className="tabs admin-tabs-modern">
                <button type="button" className={`tab ${tab === "content" ? "active" : ""}`} onClick={() => setTab("content")}>
                    Nội dung
                </button>
                <button type="button" className={`tab ${tab === "tests" ? "active" : ""}`} onClick={() => setTab("tests")}>
                    Bài kiểm tra
                </button>
            </div>

            {tab === "content" ? (
                <div className="card admin-page-stack admin-table-card">
                    <h3>Thông tin bài học</h3>
                    <form onSubmit={handleSaveLesson} className="admin-form-grid admin-form-grid-tight">
                        <label>
                            Tiêu đề bài học
                            <input value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} />
                        </label>
                        <label>
                            Thứ tự bài
                            <input type="number" min={1} value={lessonOrder} onChange={(event) => setLessonOrder(Number(event.target.value))} />
                        </label>
                        <div className="admin-form-actions span-2">
                            <button type="submit" className="btn" disabled={savingLesson || loadingLesson}>
                                <Plus size={14} />
                                {savingLesson ? "Đang lưu..." : "Lưu bài học"}
                            </button>
                        </div>
                    </form>

                    <h3>{editingContentId ? "Cập nhật nội dung" : "Thêm nội dung"}</h3>
                    <form onSubmit={handleSubmitContent} className="admin-form-grid admin-form-grid-tight">
                        {fields.map((field) => (
                            <label key={field.name} className={field.fullWidth ? "span-2" : ""}>
                                {field.label}
                                {field.type === "textarea" ? (
                                    <textarea
                                        rows={getContentTextareaRows(field)}
                                        value={formState[field.name] || ""}
                                        placeholder={field.placeholder}
                                        title={field.hint || field.placeholder}
                                        onChange={(event) => setFieldValue(field.name, event.target.value)}
                                    />
                                ) : field.type === "select" ? (
                                    <select
                                        value={formState[field.name] || field.defaultValue || ""}
                                        onChange={(event) => setFieldValue(field.name, event.target.value)}
                                    >
                                        {(field.options || []).map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === "file" ? (
                                    <div className="admin-file-field">
                                        <input
                                            type="file"
                                            accept="image/*,.gif"
                                            ref={(el) => (fileInputsRef.current[field.name] = el)}
                                            onChange={(event) => handleFileUpload(field.name, event.target.files?.[0])}
                                        />
                                        {Boolean(previewByField[field.name] || formState[field.name]) ? (
                                            <div className="admin-media-preview">
                                                <img
                                                    src={previewByField[field.name] || formState[field.name]}
                                                    alt={field.label}
                                                    className="w-full h-full object-cover"
                                                    style={{ objectFit: "cover", maxWidth: "100%", height: "200px" }}
                                                />
                                            </div>
                                        ) : null}
                                        {Boolean(previewByField[field.name] || formState[field.name]) ? (
                                            <button
                                                type="button"
                                                className="admin-ghost-btn"
                                                onClick={() => void handleClearFileField(field.name)}
                                            >
                                                <Trash2 size={14} />
                                                Xóa ảnh
                                            </button>
                                        ) : null}
                                        {uploadingField === field.name ? <p className="admin-field-hint">Đang tải ảnh...</p> : null}
                                        {uploadingField !== field.name && pendingUploadFields.includes(field.name) ? (
                                            <p className="admin-field-hint">Ảnh đang được xem trước trên máy và chỉ tải lên khi bạn bấm Lưu.</p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <input
                                        value={formState[field.name] || ""}
                                        placeholder={field.placeholder}
                                        title={field.hint || field.placeholder}
                                        onChange={(event) => setFieldValue(field.name, event.target.value)}
                                    />
                                )}
                                {field.hint ? (
                                    <p className="admin-field-hint">{field.hint}</p>
                                ) : moduleKey === "grammar" ? (
                                    <p className="admin-field-hint" aria-hidden="true">&nbsp;</p>
                                ) : null}
                            </label>
                        ))}

                        <div className="admin-form-actions span-2">
                            {editingContentId ? (
                                <button
                                    type="button"
                                    className="admin-icon-btn"
                                    aria-label="Tạo nội dung mới"
                                    title="Tạo nội dung mới"
                                    onClick={resetContentForm}
                                    disabled={savingContent || loadingContent || Boolean(uploadingField)}
                                >
                                    <RotateCcw size={16} />
                                </button>
                            ) : null}
                            {moduleKey === "reading" ? (
                                <button
                                    type="button"
                                    className="admin-ghost-btn"
                                    onClick={() => setShowContentPreview((prev) => !prev)}
                                    aria-pressed={showContentPreview}
                                >
                                    <CheckCircle2 size={14} />
                                    {showContentPreview ? "Ẩn xem trước" : "Xem trước"}
                                </button>
                            ) : null}
                            <button type="submit" className="btn" disabled={savingContent || loadingContent || Boolean(uploadingField)}>
                                <Plus size={14} />
                                {savingContent ? "Đang lưu..." : editingContentId ? "Cập nhật nội dung" : "Thêm nội dung"}
                            </button>
                        </div>
                    </form>

                    {moduleKey === "reading" && showContentPreview ? (
                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Xem trước bài đọc</p>
                                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                                        {formState.title || "(Chưa có tiêu đề)"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowMeaningPreview((prev) => !prev)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${showMeaningPreview ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)]"}`}
                                    >
                                        Dịch
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowReadingPreview((prev) => !prev)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${showReadingPreview ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)]"}`}
                                    >
                                        Cách đọc
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Nội dung gốc</p>
                                <RubyText
                                    text={formState.content}
                                    className="mt-2 whitespace-pre-line text-base leading-relaxed text-[var(--color-text)]"
                                    rtClassName="text-[10px] text-[var(--color-text-soft)]"
                                    highlightQuotedText
                                    showFurigana={showReadingPreview}
                                />
                            </div>

                            {formState.romaji ? (
                                <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Romaji</p>
                                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">
                                        {formState.romaji}
                                    </p>
                                </div>
                            ) : null}

                            {showMeaningPreview ? (
                                <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Dịch tiếng Việt</p>
                                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">
                                        {formState.translation || "Chưa có nghĩa tiếng Việt."}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <h3>Nội dung hiện tại</h3>
                    <table className="table admin-data-table admin-reading-table">
                        <thead>
                            <tr>
                                <th>{contentColumns[0]}</th>
                                <th>{contentColumns[1]}</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingContent ? (
                                <TableLoadingRow colSpan={4} message="Đang tải nội dung bài học..." />
                            ) : contentRows.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="small">Chưa có nội dung.</td>
                                </tr>
                            ) : (
                                contentRows.map((item) => {
                                    const row = mapContentToRow(moduleKey, item);

                                    return (
                                        <tr key={item.id}>
                                            <td className="admin-reading-title-cell" title={row.col1}>
                                                {row.col1}
                                            </td>
                                            <td className="admin-reading-summary-cell" title={row.col2}>
                                                {row.col2}
                                            </td>
                                            <td>
                                                <span className={`status-pill ${item.status === "published" ? "published" : "draft"}`}>
                                                    {STATUS_LABEL[item.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="admin-action-row">
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn"
                                                        aria-label="Chỉnh sửa"
                                                        title="Chỉnh sửa"
                                                        onClick={() => handleEditContent(item)}
                                                    >
                                                        <SquarePen size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn danger"
                                                        aria-label="Xóa"
                                                        title="Xóa"
                                                        onClick={() => handleDeleteContent(item.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card admin-page-stack admin-table-card">
                    <h3>Bài kiểm tra</h3>
                    <p className="small">Quản lý bài kiểm tra theo mô-đun cho bài học này.</p>
                    <div className="admin-action-row">
                        <Link href={`/admin/tests/${normalizedLevel}/create?module=${moduleKey}&lessonId=${lessonId}&kind=mini_practice&backTo=${encodeURIComponent(lessonBackHref)}`} className="admin-ghost-btn">
                            <Plus size={14} />
                            Tạo bài kiểm tra
                        </Link>
                    </div>
                    <div className="admin-mini-note">
                        <span className="chip">Bài kiểm tra theo mô-đun</span>
                    </div>
                    <table className="table admin-data-table">
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Loại</th>
                                <th>Số câu</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingTests ? (
                                <TableLoadingRow colSpan={5} message="Đang tải bài kiểm tra..." />
                            ) : tests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="small">Chưa có bài kiểm tra.</td>
                                </tr>
                            ) : (
                                renderTestRows()
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AudioLines, BookOpenText, CheckCircle2, Mic2, Pause, Plus, RotateCcw, SquarePen, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import RubyText from "@/components/feature/RubyText";
import ConfirmDialog from "@/components/feature/ConfirmDialog";
import { readingFromInlineRubyText, stripInlineRubyText } from "@/utils/grammarQuestionBuilder";
import {
    createAdminContent,
    deleteAdminAudio,
    deleteAdminImage,
    getAdminContent,
    updateAdminContent,
    uploadAdminAudio,
    uploadAdminImage,
} from "@/src/services/admin.service";

const emptySpeakingItem = () => ({ title: "", imageUrl: "", audioAssetId: "", audioPublicId: "", audioProvider: "", audioUrl: "", audioTemporary: false, script: "", scriptEnabled: true });
const emptyReadingItem = () => ({ title: "", audioAssetId: "", audioPublicId: "", audioProvider: "", audioUrl: "", audioTemporary: false, content: "", contentWithHiragana: "", romaji: "", translation: "" });
const initialState = () => ({ title: "", setOrder: 1, status: "draft", speakingItems: [emptySpeakingItem()], readingItems: [] });

function ReadingDraftPreview({ item }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [showReading, setShowReading] = useState(false);
    const [showRomaji, setShowRomaji] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);

    useEffect(() => () => {
        audioRef.current?.pause();
        if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    }, []);

    const toggleAudio = () => {
        if (item.audioUrl) {
            if (playing) audioRef.current?.pause();
            else void audioRef.current?.play();
            return;
        }
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const speakText = stripInlineRubyText(item.contentWithHiragana || readingFromInlineRubyText(item.content) || item.content).trim();
        if (!speakText) return;
        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.lang = "ja-JP";
        window.speechSynthesis.speak(utterance);
    };

    return (
        <article className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <audio ref={audioRef} src={item.audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
            <h2 className="text-lg font-bold text-[var(--color-text)]">{item.title || "(Chưa có tiêu đề)"}</h2>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowReading((value) => !value)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm">Cách đọc</button>
                <button type="button" onClick={() => setShowRomaji((value) => !value)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm">Romaji</button>
                <button type="button" onClick={() => setShowTranslation((value) => !value)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm">Dịch</button>
                <button type="button" onClick={toggleAudio} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm">{playing ? <Pause className="h-4 w-4 text-rose-500" /> : <AudioLines className="h-4 w-4 text-rose-500" />}{playing ? "Dừng" : "Nghe"}</button>
            </div>
            <RubyText text={item.content} showFurigana={showReading} highlightQuotedText className="whitespace-pre-line text-base leading-8 text-[var(--color-text)]" rtClassName="text-[10px] text-[var(--color-text-soft)]" />
            {showRomaji ? <p className="whitespace-pre-line rounded-xl bg-[var(--color-bg-soft)] p-3 text-sm">{item.romaji || "Chưa có romaji."}</p> : null}
            {showTranslation ? <p className="whitespace-pre-line rounded-xl bg-[var(--color-bg-soft)] p-3 text-sm">{item.translation || "Chưa có bản dịch."}</p> : null}
        </article>
    );
}

function resizeScriptTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function normalizeLoadedItem(item) {
    const normalizeAudioProvider = (provider) => String(provider || "").trim() === "cloudinary" ? "" : String(provider || "").trim();

    const legacySpeakingItem = item.audioUrl ? [{
        title: item.title || "Phần nói",
        imageUrl: item.imageUrl || "",
        audioAssetId: item.audioAssetId || "",
        audioPublicId: item.audioPublicId || "",
        audioProvider: normalizeAudioProvider(item.audioProvider),
        audioUrl: item.audioUrl || "",
        script: item.script || "",
        scriptEnabled: item.scriptEnabled !== false,
    }] : [];

    return {
        title: item.title || "",
        setOrder: Number(item.setOrder) || 1,
        status: item.status || "draft",
        speakingItems: Array.isArray(item.speakingItems) && item.speakingItems.length ? item.speakingItems.map((speakingItem) => ({
            ...emptySpeakingItem(),
            ...speakingItem,
            audioProvider: normalizeAudioProvider(speakingItem.audioProvider),
        })) : legacySpeakingItem,
        readingItems: Array.isArray(item.readingItems) ? item.readingItems.map((readingItem) => ({
            ...emptyReadingItem(),
            ...readingItem,
            audioProvider: normalizeAudioProvider(readingItem.audioProvider),
            contentWithHiragana: readingItem.contentWithHiragana || readingFromInlineRubyText(readingItem.content || ""),
        })) : [],
    };
}

export default function SpeakingEditorPage({ level, contentId, mode = "create" }) {
    const readingAudioInputRef = useRef(null);
    const pendingImageFilesRef = useRef({});
    const imagePreviewUrlsRef = useRef({});
    const [formState, setFormState] = useState(initialState);
    const [savedState, setSavedState] = useState(initialState);
    const [activeTab, setActiveTab] = useState("speaking");
    const [loading, setLoading] = useState(Boolean(contentId));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState("");
    const [readingDraft, setReadingDraft] = useState(emptyReadingItem);
    const [editingReadingIndex, setEditingReadingIndex] = useState(-1);
    const [showContentPreview, setShowContentPreview] = useState(false);
    const [deleteReadingIndex, setDeleteReadingIndex] = useState(-1);
    const [imagePreviewByIndex, setImagePreviewByIndex] = useState({});
    const router = useRouter();
    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const isEditMode = mode === "edit" && Boolean(contentId);

    useEffect(() => {
        let mounted = true;
        const loadItem = async () => {
            if (!contentId) {
                setLoading(false);
                return;
            }
            try {
                const data = await getAdminContent("speaking", contentId);
                if (mounted) {
                    const normalized = normalizeLoadedItem(data?.item || {});
                    setFormState(normalized);
                    setSavedState(normalized);
                }
            } catch (error) {
                if (mounted) notify.error(error, "Không tải được đề speaking");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadItem();
        return () => { mounted = false; };
    }, [contentId]);

    useEffect(() => () => {
        Object.values(imagePreviewUrlsRef.current).forEach((url) => {
            if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
    }, []);

    const setField = (field, value) => setFormState((current) => ({ ...current, [field]: value }));
    const setListField = (listName, index, field, value) => setFormState((current) => ({
        ...current,
        [listName]: current[listName].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
    const addItem = (listName) => setFormState((current) => ({
        ...current,
        [listName]: [...current[listName], listName === "speakingItems" ? emptySpeakingItem() : emptyReadingItem()],
    }));

    const clearImagePreview = (index) => {
        const previewUrl = imagePreviewUrlsRef.current[index];
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        delete imagePreviewUrlsRef.current[index];
        delete pendingImageFilesRef.current[index];
        setImagePreviewByIndex((current) => {
            const next = { ...current };
            delete next[index];
            return next;
        });
    };

    const clearAllImagePreviews = () => {
        Object.values(imagePreviewUrlsRef.current).forEach((url) => {
            if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        imagePreviewUrlsRef.current = {};
        pendingImageFilesRef.current = {};
        setImagePreviewByIndex({});
    };

    const removeItem = (listName, index) => {
        if (listName === "speakingItems") {
            const removedItem = formState.speakingItems[index];
            if (removedItem?.audioTemporary) {
                void deleteAdminAudio({
                    id: removedItem.audioPublicId,
                    public_id: removedItem.audioPublicId,
                    provider: "r2",
                    url: removedItem.audioUrl,
                }).catch(() => {});
            }

            const nextFiles = {};
            const nextPreviews = {};
            Object.entries(pendingImageFilesRef.current).forEach(([key, file]) => {
                const itemIndex = Number(key);
                if (itemIndex < index) nextFiles[itemIndex] = file;
                if (itemIndex > index) nextFiles[itemIndex - 1] = file;
            });
            Object.entries(imagePreviewUrlsRef.current).forEach(([key, url]) => {
                const itemIndex = Number(key);
                if (itemIndex === index && url?.startsWith("blob:")) URL.revokeObjectURL(url);
                if (itemIndex < index) nextPreviews[itemIndex] = url;
                if (itemIndex > index) nextPreviews[itemIndex - 1] = url;
            });
            pendingImageFilesRef.current = nextFiles;
            imagePreviewUrlsRef.current = nextPreviews;
            setImagePreviewByIndex(nextPreviews);
        }

        setFormState((current) => ({ ...current, [listName]: current[listName].filter((_, itemIndex) => itemIndex !== index) }));
    };

    const resetReadingDraft = () => {
        if (readingDraft.audioTemporary) {
            void deleteAdminAudio({
                id: readingDraft.audioPublicId,
                public_id: readingDraft.audioPublicId,
                provider: "r2",
                url: readingDraft.audioUrl,
            }).catch(() => {});
        }
        setReadingDraft(emptyReadingItem());
        setEditingReadingIndex(-1);
        setShowContentPreview(false);
    };

    const submitReadingDraft = async (event) => {
        event.preventDefault();
        if (!readingDraft.title.trim() || !readingDraft.content.trim()) {
            return notify.error(null, "Vui lòng nhập tiêu đề và nội dung bài đọc.");
        }

        const nextItem = {
            ...readingDraft,
            title: readingDraft.title.trim(),
            content: readingDraft.content.trim(),
            contentWithHiragana: String(readingDraft.contentWithHiragana || "").trim() || readingFromInlineRubyText(readingDraft.content),
            romaji: readingDraft.romaji.trim(),
            translation: readingDraft.translation.trim(),
        };
        const nextReadingItems = editingReadingIndex >= 0
            ? formState.readingItems.map((item, index) => index === editingReadingIndex ? { ...item, ...nextItem } : item)
            : [...formState.readingItems, nextItem];
        const saved = await saveCurrentTab({ tab: "reading", readingItemsOverride: nextReadingItems });
        if (saved) {
            resetReadingDraft();
        }
    };

    const editReadingItem = (item, index) => {
        setReadingDraft({ ...emptyReadingItem(), ...item });
        setEditingReadingIndex(index);
        setShowContentPreview(false);
    };

    const removeReadingItem = (index) => {
        setDeleteReadingIndex(index);
    };

    const confirmRemoveReadingItem = async () => {
        const index = deleteReadingIndex;
        if (index < 0) return;
        setDeleteReadingIndex(-1);
        const nextReadingItems = formState.readingItems.filter((_, itemIndex) => itemIndex !== index);
        const saved = await saveCurrentTab({ tab: "reading", readingItemsOverride: nextReadingItems });
        if (saved) {
            if (editingReadingIndex === index) resetReadingDraft();
            else if (editingReadingIndex > index) setEditingReadingIndex((current) => current - 1);
        }
    };

    const uploadImage = (index, file) => {
        if (!file) return;
        clearImagePreview(index);
        const previewUrl = URL.createObjectURL(file);
        pendingImageFilesRef.current[index] = file;
        imagePreviewUrlsRef.current[index] = previewUrl;
        setImagePreviewByIndex((current) => ({ ...current, [index]: previewUrl }));
    };

    const uploadAudio = async (index, file) => {
        if (!file) return;
        setUploading(`audio-${index}`);
        try {
            const previous = formState.speakingItems[index];
            const result = await uploadAdminAudio(file);
            const data = result?.data || result || {};
            if (!data.url || !data.id) throw new Error("Không nhận được thông tin audio.");
            const provider = data.provider || (data.public_id ? "r2" : "mongodb");
            setFormState((current) => ({
                ...current,
                speakingItems: current.speakingItems.map((item, itemIndex) => itemIndex === index ? {
                    ...item,
                    audioAssetId: provider === "mongodb" ? data.id : "",
                    audioPublicId: data.public_id || "",
                    audioProvider: provider,
                    audioUrl: data.url,
                    audioTemporary: Boolean(data.temporary),
                } : item),
            }));
            if (previous?.audioTemporary && previous.audioUrl && previous.audioUrl !== data.url) {
                void deleteAdminAudio({ id: previous.audioAssetId || previous.audioPublicId, public_id: previous.audioPublicId, provider: previous.audioProvider, url: previous.audioUrl }).catch(() => {});
            }
        } catch (error) {
            notify.error(error, "Tải audio thất bại");
        } finally {
            setUploading("");
        }
    };

    const deleteSpeakingImage = async (index) => {
        clearImagePreview(index);
        setListField("speakingItems", index, "imageUrl", "");
        notify.info("Ảnh sẽ được xóa khỏi R2 khi bạn lưu phần nói.");
    };

    const deleteSpeakingAudio = async (index) => {
        const item = formState.speakingItems[index];
        if (!item?.audioUrl) return;
        setUploading(`delete-audio-${index}`);
        try {
            if (item.audioTemporary) {
                await deleteAdminAudio({
                    id: item.audioAssetId || item.audioPublicId,
                    public_id: item.audioPublicId,
                    provider: item.audioProvider,
                    url: item.audioUrl,
                });
            }
            setFormState((current) => ({
                ...current,
                speakingItems: current.speakingItems.map((speakingItem, itemIndex) => itemIndex === index ? {
                    ...speakingItem,
                    audioAssetId: "",
                    audioPublicId: "",
                    audioProvider: "",
                    audioUrl: "",
                    audioTemporary: false,
                } : speakingItem),
            }));
            notify.info(item.audioTemporary ? "Đã xóa audio tạm." : "Audio sẽ được xóa khỏi R2 khi bạn lưu phần nói.");
        } catch (error) {
            notify.error(error, "Xóa audio thất bại");
        } finally {
            setUploading("");
        }
    };

    const uploadReadingAudio = async (file) => {
        if (!file) return;
        setUploading("reading-audio");
        try {
            const previous = readingDraft;
            const result = await uploadAdminAudio(file);
            const data = result?.data || result || {};
            if (!data.url || !data.id) throw new Error("Không nhận được thông tin audio.");
            const provider = data.provider || (data.public_id ? "r2" : "mongodb");
            setReadingDraft((current) => ({
                ...current,
                audioAssetId: provider === "mongodb" ? data.id : "",
                audioPublicId: data.public_id || "",
                audioProvider: provider,
                audioUrl: data.url,
                audioTemporary: Boolean(data.temporary),
            }));
            if (previous.audioTemporary && previous.audioUrl && previous.audioUrl !== data.url) {
                void deleteAdminAudio({ id: previous.audioAssetId || previous.audioPublicId, public_id: previous.audioPublicId, provider: previous.audioProvider, url: previous.audioUrl }).catch(() => {});
            }
        } catch (error) {
            notify.error(error, "Tải audio thất bại");
        } finally {
            setUploading("");
        }
    };

    const deleteReadingAudio = async () => {
        if (!readingDraft.audioUrl) return;
        setUploading("delete-reading-audio");
        try {
            if (readingDraft.audioTemporary) await deleteAdminAudio({
                id: readingDraft.audioAssetId || readingDraft.audioPublicId,
                public_id: readingDraft.audioPublicId,
                provider: readingDraft.audioProvider,
                url: readingDraft.audioUrl,
            });
            setReadingDraft((current) => ({
                ...current,
                audioAssetId: "",
                audioPublicId: "",
                audioProvider: "",
                audioUrl: "",
                audioTemporary: false,
            }));
            if (readingAudioInputRef.current) readingAudioInputRef.current.value = "";
            notify.info(readingDraft.audioTemporary ? "Đã xóa audio tạm." : "Audio sẽ được xóa khỏi R2 khi bạn lưu nội dung.");
        } catch (error) {
            notify.error(error, "Xóa audio thất bại");
        } finally {
            setUploading("");
        }
    };

    const saveCurrentTab = async ({ tab = activeTab, readingItemsOverride = null } = {}) => {
        if (!formState.title.trim()) return notify.error(null, "Vui lòng nhập tên đề.");
        if (uploading) return notify.error(null, "Vui lòng chờ tải tệp hoàn tất.");

        if (tab === "speaking") {
            if (!formState.speakingItems.length) return notify.error(null, "Vui lòng thêm ít nhất một bài nói.");
            const invalidIndex = formState.speakingItems.findIndex((item) => !item.audioUrl.trim());
            if (invalidIndex >= 0) return notify.error(null, `Vui lòng thêm audio cho bài nói ${invalidIndex + 1}.`);
        } else {
            const readingItemsToSave = readingItemsOverride || formState.readingItems;
            if (!readingItemsToSave.length) return notify.error(null, "Vui lòng thêm ít nhất một bài đọc.");
            const invalidIndex = readingItemsToSave.findIndex((item) => !item.title.trim() || !item.content.trim());
            if (invalidIndex >= 0) return notify.error(null, `Vui lòng nhập tiêu đề và nội dung cho bài đọc ${invalidIndex + 1}.`);
        }

        const stagedImageUrls = [];
        setSaving(true);
        try {
            let speakingSource = tab === "speaking" ? formState.speakingItems.map((item) => ({ ...item })) : isEditMode ? savedState.speakingItems : [];
            const readingSource = tab === "reading" ? (readingItemsOverride || formState.readingItems) : isEditMode ? savedState.readingItems : [];

            if (tab === "speaking") {
                for (const [rawIndex, file] of Object.entries(pendingImageFilesRef.current)) {
                    const index = Number(rawIndex);
                    if (!file || !speakingSource[index]) continue;

                    setUploading(`image-${index}`);
                    const uploaded = await uploadAdminImage(file);
                    const url = uploaded?.data?.url || uploaded?.url || "";
                    if (!url) throw new Error("Không nhận được URL ảnh.");
                    stagedImageUrls.push(url);
                    speakingSource = speakingSource.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, imageUrl: url } : item
                    ));
                }
            }

            const speakingItems = speakingSource.map((item) => {
                const nextItem = {
                    ...item,
                    title: formState.title.trim(),
                    script: item.script.trim(),
                };
                delete nextItem.audioTemporary;
                return nextItem;
            });
            const readingItems = readingSource.map((item) => {
                const nextItem = {
                    ...item,
                    title: item.title.trim(),
                    content: item.content.trim(),
                    contentWithHiragana: String(item.contentWithHiragana || "").trim() || readingFromInlineRubyText(item.content),
                    romaji: item.romaji.trim(),
                    translation: item.translation.trim(),
                };
                delete nextItem.audioTemporary;
                return nextItem;
            });
            const payload = {
                module: "speaking",
                level: displayLevel,
                title: formState.title.trim(),
                setOrder: Number(formState.setOrder) || 1,
                status: formState.status,
                speakingItems,
                readingItems,
            };

            let result;
            if (isEditMode) {
                result = await updateAdminContent("speaking", contentId, payload);
            } else {
                result = await createAdminContent(payload);
                const createdId = result?.item?.id || result?.id;
                if (createdId) router.replace(`/admin/speaking/${normalizedLevel}/${createdId}`);
            }

            const normalized = normalizeLoadedItem(result?.item || payload);
            setSavedState(normalized);
            if (tab === "speaking") {
                setFormState(normalized);
                clearAllImagePreviews();
            } else {
                setFormState((current) => ({ ...normalized, speakingItems: current.speakingItems }));
            }
            notify.success(tab === "speaking" ? "Đã lưu phần nói" : editingReadingIndex >= 0 ? "Đã cập nhật nội dung" : "Đã thêm nội dung");
            return true;
        } catch (error) {
            await Promise.allSettled(stagedImageUrls.map((url) => deleteAdminImage(url)));
            notify.error(error, tab === "speaking" ? "Lưu phần nói thất bại" : "Lưu nội dung thất bại");
            return false;
        } finally {
            setUploading("");
            setSaving(false);
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy"><p className="admin-kicker">Speaking</p><h2>{isEditMode ? "Chỉnh sửa đề" : "Tạo đề mới"}</h2><p className="small">{displayLevel} - Quản lý riêng phần nói và phần đọc.</p></div>
                <Link href={`/admin/speaking/${normalizedLevel}`} className="admin-ghost-btn"><ArrowLeft size={14} />Quay lại</Link>
            </div>

            <div className="card admin-form-card admin-form-grid admin-form-grid-tight">
                <label className="span-2">Tên đề<input value={formState.title} onChange={(event) => setField("title", event.target.value)} placeholder="Ví dụ: Đề 1" /></label>
                <label>Thứ tự đề<input type="number" min="1" value={formState.setOrder} onChange={(event) => setField("setOrder", Number(event.target.value))} /></label>
                <label>Trạng thái<select value={formState.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option></select></label>
            </div>

            <div className="tabs speaking-editor-tabs" role="tablist" aria-label="Nội dung đề speaking">
                <button type="button" role="tab" aria-selected={activeTab === "speaking"} className={`tab ${activeTab === "speaking" ? "active" : ""}`} onClick={() => setActiveTab("speaking")}><Mic2 size={16} />Phần nói</button>
                <button type="button" role="tab" aria-selected={activeTab === "reading"} className={`tab ${activeTab === "reading" ? "active" : ""}`} onClick={() => setActiveTab("reading")}><BookOpenText size={16} />Phần đọc</button>
            </div>

            {activeTab === "speaking" ? (
                <div className="card admin-form-card">
                    <div className="admin-question-builder-head"><div><h3>Phần nói</h3><p className="small">Chỉnh ảnh, audio và script độc lập với phần đọc.</p></div><div className="admin-action-row"><button type="button" className="admin-ghost-btn" onClick={() => addItem("speakingItems")}><Plus size={14} />Thêm bài nói</button><button type="button" className="btn" onClick={() => saveCurrentTab({ tab: "speaking" })} disabled={saving || loading || Boolean(uploading)}><CheckCircle2 size={14} />{saving ? "Đang lưu..." : "Lưu phần nói"}</button></div></div>
                    <div className="admin-question-list">
                        {formState.speakingItems.map((item, index) => (
                            <article key={item._id || `speaking-${index}`} className="card admin-question-card admin-form-grid">
                                {formState.speakingItems.length > 1 ? <div className="admin-question-card-head span-2 justify-end"><button type="button" className="admin-icon-btn danger" onClick={() => removeItem("speakingItems", index)} title="Xóa"><Trash2 size={16} /></button></div> : null}
                                <label className="span-2">Hình ảnh<input key={`image-input-${index}-${item.imageUrl}`} type="file" accept="image/*,.gif" onChange={(event) => uploadImage(index, event.target.files?.[0])} />{imagePreviewByIndex[index] || item.imageUrl ? <><img src={imagePreviewByIndex[index] || item.imageUrl} alt="" className="mt-3 max-h-72 w-full rounded-lg object-contain" /><button type="button" className="admin-ghost-btn mt-3" onClick={() => deleteSpeakingImage(index)} disabled={Boolean(uploading)}><Trash2 size={14} />Xóa ảnh</button></> : null}{imagePreviewByIndex[index] ? <p className="admin-field-hint">Ảnh đang được xem trước trên máy và chỉ tải lên khi bạn bấm Lưu.</p> : null}{uploading === `image-${index}` ? <p className="admin-field-hint">Đang tối ưu và tải ảnh...</p> : null}</label>
                                <label className="span-2">Audio<input key={`audio-input-${index}-${item.audioUrl}`} type="file" accept="audio/*" onChange={(event) => uploadAudio(index, event.target.files?.[0])} />{item.audioUrl ? <><audio controls src={item.audioUrl} className="mt-3 w-full" /><button type="button" className="admin-ghost-btn mt-3" onClick={() => deleteSpeakingAudio(index)} disabled={Boolean(uploading)}><Trash2 size={14} />{uploading === `delete-audio-${index}` ? "Đang xóa..." : "Xóa audio"}</button></> : null}{uploading === `audio-${index}` ? <p className="admin-field-hint">Đang tải audio...</p> : null}</label>
                                <label>Hiển thị script<select value={item.scriptEnabled ? "on" : "off"} onChange={(event) => setListField("speakingItems", index, "scriptEnabled", event.target.value === "on")}><option value="on">Có</option><option value="off">Không</option></select></label>
                                <label className="span-2">Script<textarea className="speaking-script-textarea" rows={10} ref={resizeScriptTextarea} value={item.script} onChange={(event) => { resizeScriptTextarea(event.currentTarget); setListField("speakingItems", index, "script", event.target.value); }} /></label>
                            </article>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card admin-page-stack admin-table-card">
                    <h3>{editingReadingIndex >= 0 ? "Cập nhật nội dung" : "Thêm nội dung"}</h3>
                    <form onSubmit={submitReadingDraft} className="admin-form-grid admin-form-grid-tight">
                        <label className="span-2">Tiêu đề<input value={readingDraft.title} onChange={(event) => setReadingDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Tiêu đề bài đọc" /></label>
                        <label className="span-2">Audio<input ref={readingAudioInputRef} type="file" accept="audio/*" onChange={(event) => uploadReadingAudio(event.target.files?.[0])} />{readingDraft.audioUrl ? <><audio controls src={readingDraft.audioUrl} className="mt-3 w-full" /><button type="button" className="admin-ghost-btn mt-3" onClick={deleteReadingAudio} disabled={Boolean(uploading)}><Trash2 size={14} />{uploading === "delete-reading-audio" ? "Đang xóa..." : "Xóa audio"}</button></> : null}{uploading === "reading-audio" ? <p className="admin-field-hint">Đang tải audio...</p> : null}</label>
                        <label className="span-2">Nội dung (kanji)<textarea rows={7} value={readingDraft.content} onChange={(event) => setReadingDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Ví dụ: 田中(たなか)さんは 先生(せんせい)です" /><p className="admin-field-hint">Cách thêm chuẩn của 3 định dạng: 私は&apos;カルロス&apos;です | &apos;6時&apos;（ろくじ）はんにおきます。| 休 (やす) みの日.</p></label>
                        <label className="span-2">Romaji<textarea rows={5} value={readingDraft.romaji} onChange={(event) => setReadingDraft((current) => ({ ...current, romaji: event.target.value }))} placeholder="Ví dụ: Watashi wa Sakura desu." /></label>
                        <label className="span-2">Bản dịch<textarea rows={5} value={readingDraft.translation} onChange={(event) => setReadingDraft((current) => ({ ...current, translation: event.target.value }))} placeholder="Bản dịch" /></label>
                        <div className="admin-form-actions span-2">
                            {editingReadingIndex >= 0 ? <button type="button" className="admin-icon-btn" aria-label="Tạo nội dung mới" title="Tạo nội dung mới" onClick={resetReadingDraft}><RotateCcw size={16} /></button> : null}
                            <button type="button" className="admin-ghost-btn" onClick={() => setShowContentPreview((value) => !value)} aria-pressed={showContentPreview}><CheckCircle2 size={14} />{showContentPreview ? "Ẩn xem trước" : "Xem trước"}</button>
                            <button type="submit" className="btn" disabled={saving || Boolean(uploading)}><Plus size={14} />{editingReadingIndex >= 0 ? "Cập nhật nội dung" : "Thêm nội dung"}</button>
                        </div>
                    </form>

                    {showContentPreview ? (
                        <ReadingDraftPreview item={readingDraft} />
                    ) : null}

                    <h3>Nội dung hiện tại</h3>
                    <table className="table admin-data-table admin-reading-table">
                        <thead><tr><th>Tiêu đề</th><th>Độ dài</th><th>Thao tác</th></tr></thead>
                        <tbody>
                            {formState.readingItems.length === 0 ? <tr><td colSpan={3} className="small">Chưa có nội dung.</td></tr> : formState.readingItems.map((item, index) => (
                                <tr key={item._id || `reading-${index}`}><td className="admin-reading-title-cell" title={item.title}>{item.title}</td><td>{item.content.length} ký tự</td><td><div className="admin-action-row"><button type="button" className="admin-icon-btn" aria-label="Chỉnh sửa" title="Chỉnh sửa" onClick={() => editReadingItem(item, index)}><SquarePen size={16} /></button><button type="button" className="admin-icon-btn danger" aria-label="Xóa" title="Xóa" onClick={() => removeReadingItem(index)}><Trash2 size={16} /></button></div></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={deleteReadingIndex >= 0}
                title="Bạn có chắc chắn muốn xóa bài đọc này không?"
                description="Bài đọc này sẽ bị xóa khỏi đề và không thể hoàn tác."
                cancelLabel="Hủy"
                confirmLabel="Xóa"
                onClose={() => setDeleteReadingIndex(-1)}
                onConfirm={confirmRemoveReadingItem}
            />
        </section>
    );
}


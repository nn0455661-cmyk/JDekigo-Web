"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import notify from "@/src/lib/notifier";
import { createAdminContent, getAdminContent, updateAdminContent } from "@/src/services/admin.service";
import { getModuleMeta } from "@/components/admin/adminConfig";

function createInitialState() {
    return {
        title: "",
        youtubeVideoId: "",
        status: "draft",
    };
}

export default function ShadowingVideoEditorPage({ level, contentId, mode = "create", moduleKey = "video", basePath = "video" }) {
    const [formState, setFormState] = useState(createInitialState);
    const [loading, setLoading] = useState(Boolean(contentId));
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const moduleMeta = useMemo(() => getModuleMeta(moduleKey), [moduleKey]);
    const isEditMode = mode === "edit" && Boolean(contentId);
    const themeClass = moduleKey === "video" ? "video-admin-theme" : "";

    useEffect(() => {
        let isMounted = true;

        const loadItem = async () => {
            if (!contentId) {
                setLoading(false);
                return;
            }

            try {
                const data = await getAdminContent(moduleKey, contentId);
                const item = data?.item || {};

                if (isMounted) {
                    setFormState({
                        title: item.title || "",
                        youtubeVideoId: item.youtubeVideoId || "",
                        status: item.status || "draft",
                    });
                }
            } catch (error) {
                if (isMounted) {
                    notify.error(error, "Không tải được video");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadItem();

        return () => {
            isMounted = false;
        };
    }, [contentId, moduleKey]);

    const setFieldValue = (field, value) => {
        setFormState((current) => ({ ...current, [field]: value }));
    };

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!formState.title.trim()) {
            notify.error(null, "Vui lòng nhập tiêu đề video.");
            return;
        }

        if (!formState.youtubeVideoId.trim()) {
            notify.error(null, "Vui lòng nhập ID video YouTube.");
            return;
        }

        setSaving(true);

        const payload = {
            module: moduleKey,
            level: displayLevel,
            title: formState.title.trim(),
            youtubeVideoId: formState.youtubeVideoId.trim(),
            status: formState.status,
        };

        try {
            if (isEditMode) {
                await updateAdminContent(moduleKey, contentId, payload);
                notify.success("Đã cập nhật video");
            } else {
                await createAdminContent(payload);
                notify.success("Đã tạo video");
            }

            router.push(`/admin/${basePath}/${normalizedLevel}`);
        } catch (error) {
            notify.error(error, isEditMode ? "Cập nhật video thất bại" : "Tạo video thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={`admin-page-stack ${themeClass}`}>
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Video</p>
                    <h2>{isEditMode ? "Chỉnh sửa video" : "Tạo video mới"}</h2>
                    <p className="small">{moduleMeta.label} - {displayLevel}</p>
                </div>
                <Link href={`/admin/${basePath}/${normalizedLevel}`} className="admin-ghost-btn">
                    <ArrowLeft size={14} />
                    Quay lại
                </Link>
            </div>

            <div className="admin-form-frame">
                <div className="card admin-form-card">
                    <form onSubmit={onSubmit} className="admin-form-grid">
                        <label>
                            Trạng thái
                            <select value={formState.status} onChange={(event) => setFieldValue("status", event.target.value)}>
                                <option value="draft">Bản nháp</option>
                                <option value="published">Xuất bản</option>
                            </select>
                        </label>
                        <label className="span-2">
                            Tiêu đề video
                            <input
                                value={formState.title}
                                onChange={(event) => setFieldValue("title", event.target.value)}
                                placeholder="Ví dụ: Bài video nghe nói"
                            />
                        </label>
                        <label className="span-2">
                            ID video YouTube
                            <input
                                value={formState.youtubeVideoId}
                                onChange={(event) => setFieldValue("youtubeVideoId", event.target.value)}
                                placeholder="Ví dụ: dQw4w9WgXcQ"
                            />
                        </label>

                        <div className="admin-form-actions span-2">
                            <button className="btn" type="submit" disabled={saving || loading}>
                                <Plus size={14} />
                                {saving ? "Đang lưu..." : isEditMode ? "Cập nhật video" : "Tạo video"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}

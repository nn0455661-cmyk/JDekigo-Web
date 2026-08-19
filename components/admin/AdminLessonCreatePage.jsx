"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import notify from "@/src/lib/notifier";
import { createAdminLesson } from "@/src/services/admin.service";
import { getModuleMeta } from "@/components/admin/adminConfig";

export default function AdminLessonCreatePage({ moduleKey, level }) {
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessonOrder, setLessonOrder] = useState(1);
    const [status, setStatus] = useState("draft");
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const moduleMeta = useMemo(() => getModuleMeta(moduleKey), [moduleKey]);

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!lessonTitle.trim()) {
            notify.error(null, "Vui lòng nhập tiêu đề bài học.");
            return;
        }

        setSubmitting(true);

        try {
            await createAdminLesson({
                module: moduleKey,
                level: displayLevel,
                lessonTitle: lessonTitle.trim(),
                lessonOrder,
                status,
            });

            notify.success("Đã tạo bài học");
            router.push(`/admin/${moduleKey}/${normalizedLevel}`);
        } catch (error) {
            notify.error(error, "Tạo bài học thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Tạo bài học</p>
                    <h2>Tạo bài {moduleMeta.label}</h2>
                    <p className="small">Mọi nội dung phải thuộc level và bài học.</p>
                    <div className="admin-subhero-pills">
                        <span className="chip">Bản nháp trước</span>
                        <span className="chip">Xuất bản sau</span>
                    </div>
                </div>
                <Link href={`/admin/${moduleKey}/${normalizedLevel}`} className="admin-ghost-btn">
                    <ArrowLeft size={14} />
                    Quay lại
                </Link>
            </div>

            <div className="admin-form-frame">
                <div className="card admin-form-card">
                    <form onSubmit={onSubmit} className="admin-form-grid">
                        <label>
                            Cấp độ
                            <input value={displayLevel} readOnly />
                        </label>
                        <label>
                            Trạng thái
                            <select value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="draft">Bản nháp</option>
                                <option value="published">Xuất bản</option>
                            </select>
                        </label>
                        <label>
                            Tiêu đề bài học
                            <input
                                value={lessonTitle}
                                onChange={(event) => setLessonTitle(event.target.value)}
                                placeholder="Ví dụ: Bài 1 - Chào hỏi"
                            />
                        </label>
                        <label>
                            Thứ tự bài
                            <input
                                type="number"
                                min={1}
                                value={lessonOrder}
                                onChange={(event) => setLessonOrder(Number(event.target.value))}
                            />
                        </label>

                        <div className="admin-form-actions span-2">
                            <button className="btn" type="submit" disabled={submitting}>
                                <Plus size={14} />
                                {submitting ? "Đang lưu..." : "Tạo bài học"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}

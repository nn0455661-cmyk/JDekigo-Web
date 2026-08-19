"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";

export default function ReadingFlashcardPage() {
    const params = useParams();

    const level = normalizeLevel(String(params?.level || DEFAULT_LEVEL).toUpperCase());
    const listHref = useMemo(() => `/reading/${level}`, [level]);

    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                <p className="text-xl font-black text-[var(--color-text)]">Đọc hiểu đã chuyển sang chế độ luyện gõ</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-soft)]">
                    Module Đọc hiểu không còn sử dụng flashcard. Vui lòng vào từng bài để học theo 2 màn hình:
                    đọc đoạn mẫu + gõ hiragana theo ký tự.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                        href={listHref}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--icon-reading)] px-4 py-2 text-sm font-semibold text-white"
                    >
                        <PencilLine className="h-4 w-4" />
                        Đi tới danh sách bài luyện gõ
                    </Link>
                    <Link
                        href={listHref}
                        className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-reading-bg)] px-4 py-2 text-sm font-semibold text-[var(--icon-reading)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

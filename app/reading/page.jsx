"use client";

import LevelFilterCards from "@/components/feature/LevelFilterCards";
import { BookOpenText, Keyboard, Speech, Target } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useContentStats } from "@/hooks/useContentCounts";
import { SUPPORTED_LEVELS } from "@/constants/levels";

export default function ReadingPage() {
    const { t } = useLanguage();
    const stats = useContentStats("reading");
    const lessonCount = SUPPORTED_LEVELS.reduce((sum, level) => sum + Number(stats.counts?.[level] || 0), 0);
    const lineCount = SUPPORTED_LEVELS.reduce((sum, level) => sum + Number(stats.itemCounts?.[level] || 0), 0);
    const levelCount = SUPPORTED_LEVELS.filter((level) => Number(stats.counts?.[level] || 0) > 0).length;

    return (
        <section className="dashboard-shell space-y-3 p-3 sm:p-4">
            <div className="flex items-center gap-3">
                <div
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ color: "var(--icon-reading)", backgroundColor: "var(--icon-reading-bg)" }}
                >
                    <Speech className="h-5 w-5" style={{ color: "var(--icon-reading)", stroke: "var(--icon-reading)" }} />
                </div>
                <h1 className="section-title">{t("reading.title")}</h1>
            </div>

            <div className="flex flex-col gap-3">
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("reading.selectLevelPrompt")}
                </p>
                <LevelFilterCards categoryLabel={t("reading.title")} routeBase="/reading" compact countByLevel={stats.counts} />

                <div className="grid gap-3 lg:grid-cols-3">
                    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                            <BookOpenText className="h-4 w-4" />
                            {t("reading.quickGuideTitle", "Cách học nhanh")}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-soft)]">
                            {t("reading.quickGuideDesc", "Vào từng bài, đọc đoạn mẫu và nghĩa tiếng Việt trước, sau đó luyện gõ hiragana để ghi nhớ câu hoàn chỉnh.")}
                        </p>
                    </article>

                    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                            <Keyboard className="h-4 w-4" />
                            {t("reading.typingTitle", "Luyện gõ")}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-soft)]">
                            {t("reading.typingDesc", "Hệ thống kiểm tra theo ký tự khi bạn nhập hiragana, giúp phát hiện lỗi chính tả và sai câu ngay trong lúc luyện.")}
                        </p>
                    </article>

                    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                            <Target className="h-4 w-4" />
                            {t("reading.overviewTitle", "Tổng quan nhanh")}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-soft)]">
                            {levelCount} {t("reading.levelUnit", "cấp độ")} - {lessonCount} {t("reading.lessonUnit", "bài đọc")} - {t("reading.aboutWord", "khoảng")} {lineCount} {t("reading.lineUnit", "dòng nội dung.")}
                        </p>
                    </article>
                </div>
            </div>
        </section>
    );
}

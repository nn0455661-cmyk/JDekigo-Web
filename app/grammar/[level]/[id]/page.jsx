"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookText, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import RequireAuth from "@/components/auth/RequireAuth";
import RubyText from "@/components/feature/RubyText";
import * as grammarService from "src/services/grammar.service";

const GRAMMAR_PER_LESSON = 5;

function buildLessons(items = []) {
    const hasLessonOrder = items.some((item) => Number(item.lessonOrder));

    if (!hasLessonOrder) {
        const sorted = [...items].sort((a, b) => Number(a.id) - Number(b.id));
        const lessons = [];

        for (let index = 0; index < sorted.length; index += GRAMMAR_PER_LESSON) {
            const chunk = sorted.slice(index, index + GRAMMAR_PER_LESSON);
            const lessonNumber = Math.floor(index / GRAMMAR_PER_LESSON) + 1;

            lessons.push({
                lessonId: lessonNumber,
                title: `Lesson ${lessonNumber}`,
                grammarItems: chunk,
            });
        }

        return lessons;
    }

    const lessonMap = new Map();
    items.forEach((item) => {
        const lessonOrder = Number(item.lessonOrder);
        if (!lessonOrder) {
            return;
        }

        if (!lessonMap.has(lessonOrder)) {
            lessonMap.set(lessonOrder, {
                lessonId: lessonOrder,
                title: item.lessonTitle || `Bài ${lessonOrder}`,
                grammarItems: [],
            });
        }

        lessonMap.get(lessonOrder).grammarItems.push(item);
    });

    return Array.from(lessonMap.values())
        .sort((a, b) => a.lessonId - b.lessonId)
        .map((lesson) => ({
            ...lesson,
            grammarItems: [...lesson.grammarItems].sort(
                (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            ),
        }));
}

export default function GrammarLessonPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const lessonId = Number(params?.id || 0);

    const [items, setItems] = useState(() => {
        const cached = grammarService.getCachedGrammar();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !grammarService.getCachedGrammar());

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/grammar/${level}/${lessonId}`);
            return;
        }

        const fetchGrammar = async () => {
            try {
                const result = await grammarService.getGrammar();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchGrammar();
    }, [rawLevel, level, lessonId, router]);

    const levelItems = useMemo(() => items.filter((item) => item.level === level), [items, level]);
    const lessons = useMemo(() => buildLessons(levelItems), [levelItems]);
    const currentLesson = useMemo(
        () => lessons.find((lesson) => lesson.lessonId === lessonId),
        [lessons, lessonId]
    );

    return (
        <RequireAuth>
            <section className="dashboard-shell space-y-6 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-grammar-bg)] text-[var(--icon-grammar)]">
                            <BookText className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="section-title">{t("grammar.title")} - {level}</h1>
                            <p className="text-sm text-[var(--color-text-soft)]">
                                {t("grammar.lessonListTitle", "Danh sách ngữ pháp trong bài")} {lessonId}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={`/grammar/${level}`}
                            className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-grammar-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-grammar)] transition hover:opacity-90"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="back-label">Quay lại</span>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <LoadingState message={t("grammar.loading")} />
                ) : !currentLesson ? (
                    <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                        {t("grammar.noLevelData", "Chưa có bài học cho cấp độ")} {level}.
                    </p>
                ) : (
                    <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-soft)]">
                                {currentLesson.title} - {t("grammar.lessonContentTitle", "Danh sách ngữ pháp trong bài")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            {currentLesson.grammarItems.map((item) => (
                                    <Link
                                    key={item.id}
                                    href={`/grammar/${level}/${lessonId}/${item.id}`}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 dark:border-purple-900/30 bg-[var(--color-surface)] px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-500 hover:shadow-[0_12px_24px_rgba(168,85,247,0.15)]"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-base font-semibold text-[var(--color-text)]">
                                            <RubyText text={item.structure} />
                                        </div>
                                        <p className="mt-0.5 text-sm text-[var(--color-text-soft)]">
                                            {item.meaning}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-purple-500" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </RequireAuth>
    );
}

"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckSquare, Square, BookOpen } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as vocabularyService from "src/services/vocabulary.service";

function makeLessonKey(topicId, lessonId) {
    return `${topicId}::${lessonId}`;
}

export default function VocabularyReviewSetupPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);

    const [items, setItems] = useState(() => {
        const cached = vocabularyService.getCachedVocabulary();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !vocabularyService.getCachedVocabulary());
    const [selectedLessonKeys, setSelectedLessonKeys] = useState([]);

    useEffect(() => {
        if (rawLevel !== level) {
            const query = searchParams.toString();
            router.replace(query ? `/vocabulary/${level}/review?${query}` : `/vocabulary/${level}/review`);
            return;
        }

        const fetchVocabulary = async () => {
            try {
                const result = await vocabularyService.getVocabulary();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchVocabulary();
    }, [rawLevel, level, router, searchParams]);

    const levelItems = useMemo(
        () => items.filter((item) => item.level === level),
        [items, level]
    );

    const topicGroups = useMemo(() => {
        const grouped = levelItems.reduce((acc, item) => {
            const topicId = item.topicId || "other";
            if (!acc[topicId]) {
                acc[topicId] = {
                    topicId,
                    topicJa: item.topicJa || "その他",
                    topicVi: item.topicVi || t("vocabulary.otherTopic", "Khác"),
                    lessons: {},
                };
            }

            const lessonId = item.lessonId || "common";
            if (!acc[topicId].lessons[lessonId]) {
                acc[topicId].lessons[lessonId] = {
                    lessonId,
                    lessonTitle: item.lessonTitle || t("vocabulary.defaultLesson", "Bài tổng hợp"),
                    lessonOrder: item.lessonOrder || 999,
                    words: [],
                };
            }

            acc[topicId].lessons[lessonId].words.push(item);
            return acc;
        }, {});

        return Object.values(grouped)
            .map((topic) => ({
                ...topic,
                lessons: Object.values(topic.lessons).sort((a, b) => {
                    if (a.lessonOrder !== b.lessonOrder) {
                        return a.lessonOrder - b.lessonOrder;
                    }
                    return a.lessonTitle.localeCompare(b.lessonTitle);
                }),
            }))
            .sort((a, b) => a.topicJa.localeCompare(b.topicJa));
    }, [levelItems, t]);

    const allLessonKeys = useMemo(
        () => topicGroups.flatMap((topic) => topic.lessons.map((lesson) => makeLessonKey(topic.topicId, lesson.lessonId))),
        [topicGroups]
    );

    useEffect(() => {
        if (!topicGroups.length) {
            return;
        }

        const mode = searchParams.get("mode");
        const topicFromQuery = searchParams.get("topic") || "";
        const lessonFromQuery = searchParams.get("lesson") || "";

        if (mode === "all") {
            setSelectedLessonKeys(allLessonKeys);
            return;
        }

        if (topicFromQuery && lessonFromQuery) {
            const key = makeLessonKey(topicFromQuery, lessonFromQuery);
            setSelectedLessonKeys(allLessonKeys.includes(key) ? [key] : []);
            return;
        }

        setSelectedLessonKeys(allLessonKeys);
    }, [allLessonKeys, searchParams, topicGroups]);

    const selectedWords = useMemo(() => {
        if (!selectedLessonKeys.length) {
            return [];
        }

        const selectedKeySet = new Set(selectedLessonKeys);
        return levelItems.filter((item) => selectedKeySet.has(makeLessonKey(item.topicId || "other", item.lessonId || "common")));
    }, [levelItems, selectedLessonKeys]);

    const toggleLesson = (topicId, lessonId) => {
        const key = makeLessonKey(topicId, lessonId);
        setSelectedLessonKeys((prev) => {
            if (prev.includes(key)) {
                return prev.filter((item) => item !== key);
            }
            return [...prev, key];
        });
    };

    const toggleAllLessons = () => {
        setSelectedLessonKeys((prev) => (prev.length === allLessonKeys.length ? [] : allLessonKeys));
    };

    const isAllSelected = selectedLessonKeys.length > 0 && selectedLessonKeys.length === allLessonKeys.length;

    const startFlashcardHref = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedLessonKeys.length) {
            params.set("lessons", selectedLessonKeys.join(","));
        }
        return `/vocabulary/${level}/flashcard?${params.toString()}`;
    }, [level, selectedLessonKeys]);

    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-vocabulary-bg)] text-[var(--icon-vocabulary)]">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("vocabulary.reviewSetupTitle", "Chuẩn bị ôn tập flashcard")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">
                            {t("vocabulary.reviewSetupSubtitle", "Chọn từng bài hoặc toàn bộ trước khi vào màn học flashcard")}
                        </p>
                    </div>
                </div>

                <Link
                    href={`/vocabulary/${level}`}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-vocabulary-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-vocabulary)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {loading ? (
                <LoadingState message={t("vocabulary.loading")} />
            ) : !topicGroups.length ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("vocabulary.noLevelData", "Chưa có từ vựng cho cấp độ")} {level}.
                </p>
            ) : (
                <>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                        <button
                            type="button"
                            onClick={toggleAllLessons}
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)]"
                        >
                            {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            {t("vocabulary.selectAllLessons", "Chọn tất cả bài")}
                        </button>
                        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
                            {t("vocabulary.selectedSummary", "Đã chọn")}: {selectedLessonKeys.length}/{allLessonKeys.length} {t("vocabulary.lessons", "bài")} - {selectedWords.length} {t("vocabulary.words", "từ")}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {topicGroups.map((topic) => (
                            <div key={topic.topicId} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                                <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                                    <p className="text-xl font-bold text-[var(--color-text)]">
                                        {topic.topicJa}
                                        <span className="ml-2 text-base font-medium text-[var(--color-text-soft)]">{topic.topicVi}</span>
                                    </p>
                                </div>

                                <div className="divide-y divide-[var(--color-border)]">
                                    {topic.lessons.map((lesson) => {
                                        const lessonKey = makeLessonKey(topic.topicId, lesson.lessonId);
                                        const checked = selectedLessonKeys.includes(lessonKey);

                                        return (
                                            <button
                                                type="button"
                                                key={lessonKey}
                                                onClick={() => toggleLesson(topic.topicId, lesson.lessonId)}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-bg-soft)]"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    {checked ? (
                                                        <CheckSquare className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                                    ) : (
                                                        <Square className="h-4 w-4 shrink-0 text-[var(--color-text-soft)]" />
                                                    )}
                                                    <p className="truncate text-lg font-semibold text-[var(--color-text)]">{lesson.lessonTitle}</p>
                                                </div>
                                                <span className="shrink-0 text-sm text-[var(--color-text-soft)]">
                                                    {lesson.words.length} {t("vocabulary.words", "từ")}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                        <p className="text-sm font-semibold text-[var(--color-text)]">{t("vocabulary.previewWords", "Xem nhanh từ sẽ ôn")}</p>
                        {selectedWords.length === 0 ? (
                            <p className="mt-2 text-sm text-[var(--color-text-soft)]">{t("vocabulary.reviewChooseHint", "Hãy chọn ít nhất một bài để chuẩn bị ôn flashcard.")}</p>
                        ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedWords.slice(0, 20).map((item) => (
                                    <span key={item.id} className="chip">
                                        {item.word} ({item.meaning})
                                    </span>
                                ))}
                            </div>
                        )}

                        {selectedWords.length === 0 ? (
                            <button
                                type="button"
                                disabled
                                className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-soft)] opacity-70"
                            >
                                {t("vocabulary.reviewChooseHint", "Hãy chọn ít nhất một bài để chuẩn bị ôn flashcard.")}
                            </button>
                        ) : (
                            <Link
                                href={startFlashcardHref}
                                className="mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                            >
                                {t("vocabulary.startFlashcard", "Bắt đầu flashcard")}
                            </Link>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

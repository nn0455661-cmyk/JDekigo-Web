"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import FlashcardPracticePanel from "@/components/feature/FlashcardPracticePanel";
import StudySetModeSwitch from "@/components/feature/StudySetModeSwitch";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as vocabularyService from "src/services/vocabulary.service";

function makeLessonKey(topicId, lessonId) {
    return `${topicId || "other"}::${lessonId || "common"}`;
}

function getSavedMode(progressKey) {
    if (!progressKey || typeof window === "undefined") return "flashcard";

    const savedMode = window.localStorage.getItem(`${progressKey}:mode`);
    return ["flashcard", "quiz", "recall"].includes(savedMode) ? savedMode : "flashcard";
}

export default function VocabularyFlashcardPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);

    const [items, setItems] = useState(() => {
        const cached = vocabularyService.getCachedVocabulary();
        return Array.isArray(cached?.data?.data)
            ? cached.data.data.map((item) => ({ ...item, mediaUrl: item.illustrationImage || item.image || "" }))
            : [];
    });
    const [loading, setLoading] = useState(() => !vocabularyService.getCachedVocabulary());
    useEffect(() => {
        if (rawLevel !== level) {
            const query = searchParams.toString();
            router.replace(query ? `/vocabulary/${level}/flashcard?${query}` : `/vocabulary/${level}/flashcard`);
            return;
        }

        const fetchVocabulary = async () => {
            try {
                const result = await vocabularyService.getVocabulary();
                const formattedData = Array.isArray(result?.data?.data)
                    ? result.data.data.map((item) => ({
                        ...item,
                        mediaUrl: item.illustrationImage || item.image || "",
                    }))
                    : [];

                setItems(formattedData);
            } finally {
                setLoading(false);
            }
        };

        fetchVocabulary();
    }, [rawLevel, level, router, searchParams]);

    const selectedLessonKeys = useMemo(() => {
        const query = searchParams.get("lessons") || "";
        return query
            .split(",")
            .map((key) => key.trim())
            .filter(Boolean);
    }, [searchParams]);

    const selectedKeySet = useMemo(() => new Set(selectedLessonKeys), [selectedLessonKeys]);
    const progressKey = useMemo(() => {
        const lessonScope = selectedLessonKeys.length ? selectedLessonKeys.join(",") : "all";
        return `flashcard-progress:vocabulary:${level}:${lessonScope}`;
    }, [level, selectedLessonKeys]);
    const [activeMode, setActiveMode] = useState(() => getSavedMode(progressKey));

    useEffect(() => {
        setActiveMode(getSavedMode(progressKey));
    }, [progressKey]);

    const handleModeChange = (mode) => {
        setActiveMode(mode);
        window.localStorage.setItem(`${progressKey}:mode`, mode);
    };

    const levelItems = useMemo(
        () => items.filter((item) => item.level === level),
        [items, level]
    );

    const flashcardItems = useMemo(() => {
        if (!selectedLessonKeys.length) {
            return levelItems;
        }

        return levelItems.filter((item) => selectedKeySet.has(makeLessonKey(item.topicId, item.lessonId)));
    }, [levelItems, selectedKeySet, selectedLessonKeys]);

    const selectedLessonNames = useMemo(() => {
        if (!flashcardItems.length) {
            return [];
        }

        const map = new Map();
        flashcardItems.forEach((item) => {
            const key = makeLessonKey(item.topicId, item.lessonId);
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    topicJa: item.topicJa || "その他",
                    topicVi: item.topicVi || t("vocabulary.otherTopic", "Khác"),
                    lessonTitle: item.lessonTitle || t("vocabulary.defaultLesson", "Bài tổng hợp"),
                });
            }
        });

        return Array.from(map.values());
    }, [flashcardItems, t]);

    const mainLesson = selectedLessonNames[0] || null;
    const pageTitle = mainLesson?.lessonTitle || `Tổng hợp Từ vựng ${level}`;
    return (
        <section className="dashboard-shell space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="section-title">{pageTitle}</h1>
                    <p className="text-sm text-[var(--color-text-soft)]">
                        {selectedLessonNames.length} {t("vocabulary.lessons", "bài")} - {flashcardItems.length} {t("vocabulary.words", "từ")}
                    </p>
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
                <LoadingState message={t("vocabulary.loading", "Đang tải từ vựng...")} />
            ) : flashcardItems.length === 0 ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                    <p className="text-sm text-[var(--color-text-soft)]">{t("vocabulary.noFlashcardSelection", "Chưa có bài học nào được chọn để học flashcard.")}</p>
                    <Link
                        href={`/vocabulary/${level}`}
                        className="mt-3 inline-flex rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
                    >
                        Quay lại
                    </Link>
                </div>
            ) : (
                <FlashcardPracticePanel
                    cards={flashcardItems}
                    t={t}
                    showLessonTitle={false}
                    cardVariant="vocabulary"
                    progressKey={progressKey}
                    studyMode={activeMode}
                    modeSwitch={
                        <StudySetModeSwitch
                            activeMode={activeMode}
                            cardCount={flashcardItems.length}
                            t={t}
                            onModeChange={handleModeChange}
                            hideRecall={true}
                        />
                    }
                />
            )}
        </section>
    );
}

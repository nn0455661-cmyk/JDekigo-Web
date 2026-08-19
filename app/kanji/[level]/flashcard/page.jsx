"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Languages } from "lucide-react";
import FlashcardPracticePanel from "@/components/feature/FlashcardPracticePanel";
import StudySetModeSwitch from "@/components/feature/StudySetModeSwitch";
import LoadingState from "@/components/LoadingState";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as kanjiService from "src/services/kanji.service";
import { buildKanjiLessons as buildAdminKanjiLessons } from "@/src/shared/utils/kanjiLessons";

function normalizeKanjiExampleLine(text) {
    let normalized = String(text || "").replace(/\s+/g, " ").trim();

    if (!normalized) {
        return "";
    }

    if (normalized.includes("|")) {
        return normalized
            .split(/\s*\|\s*/)
            .map((part) => normalizeKanjiExampleLine(part))
            .filter(Boolean)
            .join("\n");
    }

    while (normalized) {
        const hasArrow = /→|=>/.test(normalized);
        const separatorPattern = hasArrow ? /\s*(?:→|=>)\s*/ : /\s*\|\s*/;
        const joiner = hasArrow ? " → " : " | ";
        const parts = normalized.split(separatorPattern).map((part) => part.trim()).filter(Boolean);

        if (parts.length < 2) {
            return normalized;
        }

        const firstHalfLength = Math.floor(parts.length / 2);
        const isDuplicatedPair = parts.length % 2 === 0 && firstHalfLength > 0;
        if (isDuplicatedPair) {
            const firstHalf = parts.slice(0, firstHalfLength).join(joiner);
            const secondHalf = parts.slice(firstHalfLength).join(joiner);

            if (firstHalf === secondHalf) {
                normalized = firstHalf;
                continue;
            }
        }

        return parts.join(joiner);
    }

    return normalized;
}

function parseKanjiExamples(exampleText) {
    const uniqueDisplays = new Set();

    return String(exampleText || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const display = normalizeKanjiExampleLine(line);

            if (!display) {
                return null;
            }

            if (uniqueDisplays.has(display)) {
                return null;
            }

            uniqueDisplays.add(display);
            return { display };
        })
        .filter(Boolean);
}

function parseLessonKeys(rawValue) {
    if (!rawValue) {
        return [];
    }

    return String(rawValue)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

function getSavedMode(progressKey) {
    if (!progressKey || typeof window === "undefined") return "flashcard";

    const savedMode = window.localStorage.getItem(`${progressKey}:mode`);
    return ["flashcard", "quiz", "recall"].includes(savedMode) ? savedMode : "flashcard";
}

export default function KanjiFlashcardPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { t } = useLanguage();

    const level = normalizeLevel(String(params?.level || DEFAULT_LEVEL).toUpperCase());
    const selectedLessonKeys = useMemo(
        () => parseLessonKeys(searchParams.get("lessons")),
        [searchParams]
    );
    const progressKey = useMemo(() => {
        const lessonScope = selectedLessonKeys.length ? selectedLessonKeys.join(",") : "all";
        return `flashcard-progress:kanji:${level}:${lessonScope}`;
    }, [level, selectedLessonKeys]);

    const [activeMode, setActiveMode] = useState(() => getSavedMode(progressKey));

    useEffect(() => {
        setActiveMode(getSavedMode(progressKey));
    }, [progressKey]);

    const handleModeChange = (mode) => {
        setActiveMode(mode);
        window.localStorage.setItem(`${progressKey}:mode`, mode);
    };

    const [items, setItems] = useState(() => {
        const cached = kanjiService.getCachedKanji();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [lessonItems, setLessonItems] = useState(() => {
        const cached = kanjiService.getCachedKanji();
        return Array.isArray(cached?.data?.lessons) ? cached.data.lessons : [];
    });
    const [loading, setLoading] = useState(() => !kanjiService.getCachedKanji());

    const historyKey = useMemo(() => `kanji-practice-history:${level}`, [level]);

    useEffect(() => {
        const fetchKanji = async () => {
            try {
                const result = await kanjiService.getKanji();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
                setLessonItems(Array.isArray(result?.data?.lessons) ? result.data.lessons : []);
            } finally {
                setLoading(false);
            }
        };

        fetchKanji();
    }, []);

    const levelItems = useMemo(
        () => items.filter((item) => item.level === level),
        [items, level]
    );

    const filteredLessonItems = useMemo(
        () => lessonItems.filter((lesson) => lesson.level === level),
        [lessonItems, level]
    );

    const lessons = useMemo(
        () => buildAdminKanjiLessons(levelItems, filteredLessonItems),
        [levelItems, filteredLessonItems]
    );

    const effectiveLessons = useMemo(() => {
        if (selectedLessonKeys.length === 0) {
            return lessons;
        }

        const selected = new Set(selectedLessonKeys);
        return lessons.filter((lesson) => selected.has(lesson.key));
    }, [lessons, selectedLessonKeys]);

    const flashcards = useMemo(
        () =>
            effectiveLessons.flatMap((lesson) =>
                lesson.items.map((item) => {
                    const examples = Array.isArray(item.examples) && item.examples.length > 0
                        ? item.examples
                        : parseKanjiExamples(item.example);
                    const exampleText = examples.length
                        ? examples
                            .map((example) => normalizeKanjiExampleLine(example.display || `${example.word || ""} → ${example.meaning || ""}`.trim()))
                            .filter(Boolean)
                            .join("\n")
                        : "Chưa có ví dụ";

                    return {
                        ...item,
                        word: item.kanji,
                        meaning: item.meaning,
                        reading: item.reading || "",
                        hanviet: item.hanviet || "",
                        onyomi: item.onyomi || "",
                        kunyomi: item.kunyomi || "",
                        mediaUrl: item.illustrationImage || item.drawingImage || "",
                        lessonTitle: item.meaning || "",
                        exampleText,
                    };
                })
            ),
        [effectiveLessons]
    );
    const pageTitle = effectiveLessons.length === 1
        ? effectiveLessons[0].lessonTitle
        : `Tổng hợp Kanji ${level.toLowerCase()}`;

    const savePracticeHistory = (summary) => {
        try {
            const existingRaw = localStorage.getItem(historyKey);
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            const next = Array.isArray(existing) ? existing : [];

            const lessonLabel = effectiveLessons.length === 1
                ? effectiveLessons[0].lessonTitle
                : `${effectiveLessons.length} bài Kanji`;

            next.unshift({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: "review",
                title: `Ôn tập - ${lessonLabel}`,
                correct: summary.known,
                total: summary.total,
                percentage: summary.percentage,
                durationSeconds: summary.durationSeconds,
                createdAt: summary.completedAt,
            });

            localStorage.setItem(historyKey, JSON.stringify(next.slice(0, 10)));
        } catch {
            // Ignore localStorage errors to keep study flow uninterrupted.
        }
    };

    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-kanji-bg)] text-[var(--icon-kanji)]">
                        <Languages className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{pageTitle}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">
                            {effectiveLessons.length} bài | {flashcards.length} thẻ
                        </p>
                    </div>
                </div>

                <Link
                    href={`/kanji/${level}`}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-kanji-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-kanji)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {loading ? (
                <LoadingState message={t("kanji.loading")} />
            ) : flashcards.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Chưa có dữ liệu để luyện flashcard.
                </p>
            ) : (
                <FlashcardPracticePanel
                    cards={flashcards}
                    t={t}
                    showLessonTitle={false}
                    onSessionComplete={savePracticeHistory}
                    progressKey={progressKey}
                    studyMode={activeMode}
                    modeSwitch={
                        <StudySetModeSwitch
                            activeMode={activeMode}
                            cardCount={flashcards.length}
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

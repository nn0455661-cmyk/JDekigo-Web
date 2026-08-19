"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useStudySets } from "@/hooks/useStudySets";
import FlashcardPracticePanel from "@/components/feature/FlashcardPracticePanel";
import StudySetModeSwitch from "@/components/feature/StudySetModeSwitch";
import LoadingState from "@/components/LoadingState";

function normalizeCard(card, index) {
    let reading = String(card.reading || "").trim();
    let hanviet = String(card.hanviet || "").trim();
    let meaning = String(card.meaning || "").trim();

    if (!reading && !hanviet && meaning) {
        const lines = meaning
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const headerParts = String(lines[0] || "").split(/\s+-\s+/);

        if (headerParts.length === 2 && /[\u3040-\u30ff]/.test(headerParts.join(""))) {
            const [firstPart, secondPart] = headerParts;
            reading = /[\u3040-\u30ff]/.test(firstPart) ? firstPart : secondPart;
            hanviet = /[\u3040-\u30ff]/.test(firstPart) ? secondPart : firstPart;
            meaning = lines.slice(1).join("\n") || meaning;
        }
    }

    return {
        id: String(card._id || card.id || `${card.word || card.term || "card"}-${index}`),
        term: card.word || card.term || "",
        reading,
        hanviet,
        meaning,
        note: card.note || card.example || "",
        noteMeaning: card.noteMeaning || card.exampleMeaning || "",
    };
}

function getSavedMode(setId) {
    if (!setId || typeof window === "undefined") {
        return "flashcard";
    }

    const savedMode = window.localStorage.getItem(`study-set-progress:${setId}:mode`);
    return ["flashcard", "quiz", "recall"].includes(savedMode) ? savedMode : "flashcard";
}

export default function StudySetFlashcardPage() {
    const { t } = useLanguage();
    const params = useParams();
    const setId = String(params?.id || "");
    const { isReady, getSetById } = useStudySets();
    const [activeMode, setActiveMode] = useState(() => getSavedMode(setId));

    const studySet = getSetById(setId);
    const cards = useMemo(() => (studySet?.cards || []).map(normalizeCard), [studySet]);
    const progressKey = studySet?._id ? `study-set-progress:${studySet._id}` : "";

    useEffect(() => {
        if (!progressKey || typeof window === "undefined") {
            return;
        }

        const savedMode = window.localStorage.getItem(`${progressKey}:mode`);
        if (["flashcard", "quiz", "recall"].includes(savedMode)) {
            setActiveMode(savedMode);
        }
    }, [progressKey]);

    const handleModeChange = (mode) => {
        setActiveMode(mode);
        if (progressKey && typeof window !== "undefined") {
            window.localStorage.setItem(`${progressKey}:mode`, mode);
        }
    };

    if (!isReady) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <LoadingState message="Đang tải flashcard..." />
            </section>
        );
    }

    if (!studySet) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.notFound")}</p>
                <Link
                    href="/study-set"
                    className="mt-3 inline-flex rounded-lg bg-[var(--icon-studyset-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-studyset)]"
                >
                    {t("studySet.backToSets")}
                </Link>
            </section>
        );
    }

    return (
        <section className="dashboard-shell space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="section-title">{studySet.name}</h1>
                    <p className="text-sm text-[var(--color-text-soft)]">
                        {cards.length} {t("studySet.cardsInDraft", "Thẻ trong học phần")}
                    </p>
                </div>

                <Link
                    href={`/study-set/${studySet._id}`}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-studyset-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-studyset)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {cards.length === 0 ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4">
                    <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.noCards")}</p>
                    <Link
                        href={`/study-set/${studySet._id}`}
                        className="mt-3 inline-flex rounded-lg bg-[var(--icon-studyset)] px-3 py-2 text-sm font-semibold text-white"
                    >
                        {t("studySet.backToSets")}
                    </Link>
                </div>
            ) : (
                <FlashcardPracticePanel
                    cards={cards.map((card) => ({
                        ...card,
                        word: card.term,
                        lessonTitle: studySet.name,
                    }))}
                    t={t}
                    listTitle={t("studySet.cardsInDraft", "Thẻ trong học phần")}
                    showLessonTitle={false}
                    cardVariant="studySet"
                    studyMode={activeMode}
                    progressKey={progressKey}
                    modeSwitch={
                        <StudySetModeSwitch
                            studySetId={studySet._id}
                            activeMode={activeMode}
                            cardCount={cards.length}
                            t={t}
                            onModeChange={handleModeChange}
                        />
                    }
                />
            )}
        </section>
    );
}

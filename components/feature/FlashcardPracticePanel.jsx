"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
    ArrowLeftRight,
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    RotateCcw,
    Volume2,
    X,
} from "lucide-react";
import RubyText from "@/components/feature/RubyText";
import { readingFromInlineRubyText } from "@/utils/grammarQuestionBuilder";

function shuffleItems(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
    }
    return next;
}

function normalizeAnswer(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,;:!?()[\]{}"']/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getAcceptedAnswers(value) {
    return String(value || "")
        .split(/[,;\/\n]| - /)
        .map(normalizeAnswer)
        .filter(Boolean);
}

function checkMeaningAnswer(input, meaning) {
    const normalizedInput = normalizeAnswer(input);
    if (!normalizedInput) return false;

    return getAcceptedAnswers(meaning).some((answer) => (
        normalizedInput === answer || normalizedInput.includes(answer) || answer.includes(normalizedInput)
    ));
}

function getProgressCardSignature(items) {
    return (items || [])
        .map((item) => String(item?.id || item?.word || ""))
        .filter(Boolean)
        .sort()
        .join("|");
}

function getStudySetDisplayLines(card) {
    let reading = String(card?.reading || "").trim();
    let hanviet = String(card?.hanviet || "").trim();
    let meaning = String(card?.meaning || "").trim();

    if (!reading && !hanviet && meaning) {
        const lines = meaning
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const headerParts = String(lines[0] || "").split(/\s+-\s+/);

        if (headerParts.length === 2 && (hasJapaneseKana(headerParts[0]) || hasJapaneseKana(headerParts[1]))) {
            const [firstPart, secondPart] = headerParts;
            reading = hasJapaneseKana(firstPart) ? firstPart : secondPart;
            hanviet = hasJapaneseKana(firstPart) ? secondPart : firstPart;
            meaning = lines.slice(1).join("\n");
        }
    }

    return { reading, hanviet, meaning };
}

function hasJapaneseKana(text) {
    return /[\u3040-\u30ff]/.test(String(text || ""));
}

function hasKanji(text) {
    return /[\u3400-\u9fff]/.test(String(text || ""));
}

export default function FlashcardPracticePanel({
    cards,
    t,
    listTitle,
    showLessonTitle = true,
    onSessionComplete,
    cardVariant = "standard",
    modeSwitch = null,
    studyMode = "flashcard",
    progressKey = "",
}) {
    const [deck, setDeck] = useState(cards || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [cardStatusById, setCardStatusById] = useState({});
    const [showSummary, setShowSummary] = useState(false);
    const [directionMode, setDirectionMode] = useState("jpToVi");
    const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now());
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizQuestionMode, setQuizQuestionMode] = useState("reading");
    const [recallInput, setRecallInput] = useState("");
    const [recallAnswers, setRecallAnswers] = useState({});
    const [recallChecked, setRecallChecked] = useState(false);
    const [recallQuestionMode, setRecallQuestionMode] = useState("reading");
    const [progressReady, setProgressReady] = useState(false);
    const completionNotifiedRef = useRef(false);
    const skipRecallSyncRef = useRef(false);

    useEffect(() => {
        const nextDeck = cards || [];
        const cardSignature = getProgressCardSignature(nextDeck);
        let savedProgress = null;

        setProgressReady(false);

        if (progressKey && typeof window !== "undefined") {
            try {
                savedProgress = JSON.parse(window.localStorage.getItem(progressKey) || "null");
            } catch {
                savedProgress = null;
            }
        }

        const canRestore = savedProgress?.cardSignature === cardSignature && nextDeck.length > 0;
        const restoredIndex = canRestore
            ? Math.min(Math.max(Number(savedProgress.currentIndex) || 0, 0), nextDeck.length - 1)
            : 0;

        setDeck(nextDeck);
        setCurrentIndex(restoredIndex);
        setShowAnswer(false);
        setIsSpeaking(false);
        setCardStatusById(canRestore && savedProgress.cardStatusById ? savedProgress.cardStatusById : {});
        setShowSummary(Boolean(canRestore && savedProgress.showSummary));
        setDirectionMode(canRestore && savedProgress.directionMode ? savedProgress.directionMode : "jpToVi");
        setSessionStartedAt(canRestore && savedProgress.sessionStartedAt ? savedProgress.sessionStartedAt : Date.now());
        setQuizAnswers(canRestore && savedProgress.quizAnswers ? savedProgress.quizAnswers : {});
        setQuizQuestionMode(canRestore && savedProgress.quizQuestionMode ? savedProgress.quizQuestionMode : "reading");
        setRecallAnswers(canRestore && savedProgress.recallAnswers ? savedProgress.recallAnswers : {});
        setRecallQuestionMode(canRestore && savedProgress.recallQuestionMode ? savedProgress.recallQuestionMode : "reading");
        setRecallInput(canRestore && savedProgress.recallInput ? savedProgress.recallInput : "");
        setRecallChecked(false);
        completionNotifiedRef.current = false;
        skipRecallSyncRef.current = canRestore;
        setProgressReady(true);
    }, [cards, progressKey]);

    const currentCard = deck[currentIndex] || null;
    const activeStudyMode = studyMode || "flashcard";
    const isQuizMode = activeStudyMode === "quiz";
    const isRecallMode = activeStudyMode === "recall";
    const isVocabularyCard = cardVariant === "vocabulary";
    const getReadingValue = useCallback((card) => String(card?.reading || card?.hanviet || "").trim(), []);
    const getQuizAnswerValue = useCallback((card, mode) => {
        if (mode === "kanji") {
            return String(card?.word || "").trim();
        }

        if (mode === "meaning") {
            return String(card?.meaning || "").trim();
        }

        if (mode === "reading" && isVocabularyCard) {
            return card?.word ? String(card.word).trim() : "";
        }

        return getReadingValue(card);
    }, [getReadingValue, isVocabularyCard]);
    let quizPromptValue = "-";
    if (quizQuestionMode === "kanji") {
        quizPromptValue = getReadingValue(currentCard) || currentCard?.meaning || "-";
    } else if (quizQuestionMode === "reading" && isVocabularyCard) {
        quizPromptValue = currentCard?.meaning || "-";
    } else {
        quizPromptValue = isVocabularyCard && currentCard?.word ? currentCard.word.replace(/\s*[\(（][^)）]*[\)）]/g, '') : currentCard?.word || "-";
    }
    const correctQuizAnswer = getQuizAnswerValue(currentCard, quizQuestionMode);
    const quizOptions = useMemo(() => {
        const correctAnswer = getQuizAnswerValue(currentCard, quizQuestionMode);
        if (!correctAnswer) {
            return [];
        }

        const distractors = shuffleItems(
            deck
                .map((card) => getQuizAnswerValue(card, quizQuestionMode))
                .filter((answer) => answer && answer !== correctAnswer)
        ).slice(0, 3);

        return shuffleItems([correctAnswer, ...distractors]).filter(Boolean);
    }, [currentCard, deck, getQuizAnswerValue, quizQuestionMode]);
    const currentQuizAnswer = currentCard?.id ? quizAnswers[currentCard.id] : "";
    const currentRecallResult = currentCard?.id ? recallAnswers[currentCard.id] : null;
    const currentRecallTarget = useMemo(() => {
        if (recallQuestionMode === "reading") {
            if (isVocabularyCard) {
                if (currentCard?.word) {
                    if (currentCard.word.match(/\s*[\(（][^)）]+[\)）]/)) {
                        return readingFromInlineRubyText(currentCard.word);
                    }
                }
            }
            return getReadingValue(currentCard) || (isVocabularyCard && currentCard?.word ? currentCard.word.replace(/\s*[\(（][^)）]*[\)）]/g, '').trim() : "");
        }
        return currentCard?.meaning;
    }, [currentCard, getReadingValue, isVocabularyCard, recallQuestionMode]);

    const recallPromptValue = useMemo(() => {
        return isVocabularyCard && currentCard?.word ? currentCard.word.replace(/\s*[\(（][^)）]*[\)）]/g, '') : currentCard?.word || "-";
    }, [currentCard, isVocabularyCard]);

    useEffect(() => {
        if (skipRecallSyncRef.current) {
            skipRecallSyncRef.current = false;
            return;
        }

        setShowAnswer(false);
        setRecallInput(currentCard?.id ? recallAnswers[currentCard.id]?.value || "" : "");
        setRecallChecked(currentCard?.id ? Boolean(recallAnswers[currentCard.id]) : false);
    }, [activeStudyMode, currentCard?.id, recallAnswers]);

    useEffect(() => {
        if (!progressReady || !progressKey || typeof window === "undefined") {
            return;
        }

        const progress = {
            version: 1,
            cardSignature: getProgressCardSignature(deck),
            currentIndex,
            cardStatusById,
            showSummary,
            directionMode,
            sessionStartedAt,
            quizAnswers,
            quizQuestionMode,
            recallAnswers,
            recallQuestionMode,
            recallInput,
            updatedAt: new Date().toISOString(),
        };

        window.localStorage.setItem(progressKey, JSON.stringify(progress));
    }, [
        cardStatusById,
        currentIndex,
        deck,
        directionMode,
        progressKey,
        progressReady,
        quizAnswers,
        quizQuestionMode,
        recallAnswers,
        recallInput,
        recallQuestionMode,
        sessionStartedAt,
        showSummary,
    ]);

    const knownCount = useMemo(
        () => Object.values(cardStatusById).filter((status) => status === "known").length,
        [cardStatusById]
    );
    const unknownCount = useMemo(
        () => Object.values(cardStatusById).filter((status) => status === "unknown").length,
        [cardStatusById]
    );
    const unknownCards = useMemo(
        () => deck.filter((card) => card?.id && cardStatusById[card.id] === "unknown"),
        [cardStatusById, deck]
    );
    const totalCount = deck.length;
    const pendingCount = Math.max(totalCount - knownCount - unknownCount, 0);
    const isFinished = totalCount > 0 && showSummary;
    const currentCardMedia = currentCard?.mediaUrl || currentCard?.illustrationImage || currentCard?.drawingImage || currentCard?.image || "";
    const getFrontFaceMedia = (card) => card?.drawingImage || card?.mediaUrl || card?.image || "";

    const isGifUrl = (url) => {
        if (!url) return false;
        const lower = String(url).toLowerCase();
        return lower.endsWith(".gif") || lower.startsWith("data:image/gif");
    };

    const renderMedia = (mediaUrl, altText, className = "") => {
        if (!mediaUrl) {
            return null;
        }

        // Use plain <img> for GIFs to preserve animation and avoid next/image optimization issues
        // Keep flashcard media fully visible instead of cropping important image content.
        const imgClass = "h-full w-full object-contain";

        return (
            <div className={`flex items-center justify-center overflow-hidden rounded-2xl bg-transparent ${className}`}>
                { }
                <img src={mediaUrl} alt={altText} className={imgClass} />
            </div>
        );
    };

    const canUseSpeech = typeof window !== "undefined" && "speechSynthesis" in window;
    const isStudySetCard = cardVariant === "studySet";
    const hasVocabularyMedia = isVocabularyCard && Boolean(currentCardMedia);
    const isViToJpMode = directionMode === "viToJp";
    const getSpeechText = useCallback((card) => {
        if (!card) {
            return "";
        }

        if (isStudySetCard) {
            return String(card.reading || readingFromInlineRubyText(card.word) || card.word || "").trim();
        }

        if (isVocabularyCard) {
            return String(card.reading || readingFromInlineRubyText(card.word) || card.word || "").trim();
        }

        return String(card.word || card.reading || "").trim();
    }, [isStudySetCard, isVocabularyCard]);
    const getVocabularyExampleText = (card) => {
        if (!card) {
            return "";
        }

        if (Array.isArray(card.examples)) {
            return card.examples
                .map((example) => {
                    if (typeof example === "string") {
                        return example.trim();
                    }

                    if (!example || typeof example !== "object") {
                        return "";
                    }

                    return [
                        example.jp || example.word || example.text || example.display,
                        example.vi || example.meaning || example.translation,
                    ].filter(Boolean).join(" - ").trim();
                })
                .filter(Boolean)
                .join("\n");
        }

        return String(card.exampleText || card.example || card.note || "").trim();
    };
    const vocabularyExampleText = getVocabularyExampleText(currentCard);
    const renderVocabularyJapaneseFace = (variant = "front") => {
        let displayWord = currentCard?.word ? currentCard.word.trim() : "-";
        let displayReading = currentCard?.reading || "";

        return (
            <RubyText
                text={displayWord}
                reading={displayReading}
                className={variant === "front"
                    ? "break-words text-3xl font-bold leading-tight tracking-wide sm:text-5xl md:text-6xl"
                    : "max-w-full break-words text-2xl font-bold leading-tight tracking-wide sm:text-4xl md:text-5xl"}
                rtClassName={variant === "front" ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base md:text-lg"}
            />
        );
    };
    const renderStudySetBackFace = () => {
        const display = getStudySetDisplayLines(currentCard);
        const reading = display.reading || currentCard?.reading || currentCard?.word || "-";
        const hanviet = display.hanviet || currentCard?.hanviet || "";
        const meaning = display.meaning || currentCard?.meaning || "-";
        const hasKanjiTerm = hasKanji(currentCard?.word || currentCard?.term || "");

        if (!hasKanjiTerm) {
            return (
                <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-3 text-center">
                    <p className="max-w-full whitespace-pre-line break-words text-2xl font-bold leading-tight text-[#1f2d3d] sm:text-4xl md:text-5xl">
                        {meaning}
                    </p>
                    {reading ? (
                        <p className="max-w-full break-words text-xl font-semibold leading-tight text-[#4f80c8] sm:text-2xl">
                            {reading}
                        </p>
                    ) : null}
                    {hanviet ? (
                        <p className="max-w-full break-words text-lg font-bold uppercase leading-tight text-[#16c97a] sm:text-2xl">
                            {hanviet}
                        </p>
                    ) : null}
                </div>
            );
        }

        return (
            <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-3 text-center sm:gap-4">
                <p className="max-w-full break-words text-3xl font-medium leading-tight text-[#58a6ff] sm:text-5xl md:text-6xl">
                    {reading}
                </p>
                {hanviet ? (
                    <p className="max-w-full break-words text-2xl font-semibold uppercase leading-tight text-[#19e586] sm:text-3xl md:text-4xl">
                        {hanviet}
                    </p>
                ) : null}
                <p className="max-w-full whitespace-pre-line break-words text-2xl font-bold leading-tight text-[#1f2d3d] sm:text-3xl md:text-4xl">
                    {meaning}
                </p>
            </div>
        );
    };
    const renderVocabularyMeaningFace = () => {
        const meaningNode = (
            <div className="flex w-full max-w-2xl flex-col items-center gap-2 text-center sm:gap-3">
                <p className="whitespace-pre-line break-words text-xl font-bold leading-tight tracking-wide text-[#1f2d3d] sm:text-2xl md:text-3xl">
                    {currentCard?.meaning || "-"}
                </p>
                {vocabularyExampleText ? (
                    <div className="w-full rounded-xl border border-[#d8e2f0] bg-[#f8fbff] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-4 sm:py-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f84a0]">Ví dụ</p>
                        <RubyText
                            text={vocabularyExampleText}
                            className="mt-1 block whitespace-pre-line break-words text-sm leading-relaxed text-[#1f2d3d] sm:text-base"
                            rtClassName="text-[10px] sm:text-xs"
                        />
                    </div>
                ) : null}
            </div>
        );

        if (!hasVocabularyMedia) {
            return meaningNode;
        }

        return (
            <div className="grid min-h-0 w-full max-w-5xl items-stretch gap-3 md:grid-cols-2 md:gap-4">
                <div className="flex min-h-[200px] h-full items-center justify-center rounded-2xl sm:border sm:border-[#d8e2f0] bg-white/70 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:min-h-[250px] sm:px-6">
                    {meaningNode}
                </div>
                <div className="flex min-h-[200px] h-full items-center justify-center px-0 py-0 sm:min-h-[250px]">
                    <div className="w-full h-full overflow-hidden rounded-2xl border border-[#d8e2f0] bg-white/70 flex items-center justify-center">
                        {renderMedia(currentCardMedia, currentCard?.word || currentCard?.meaning || "media", "h-full w-full")}
                    </div>
                </div>
            </div>
        );
    };
    const previousButtonClassName = isVocabularyCard
        ? "absolute left-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--icon-vocabulary)] bg-[var(--icon-vocabulary-bg)] text-[var(--icon-vocabulary)] shadow-[0_8px_20px_rgba(2,179,122,0.12)] transition hover:bg-[rgba(2,179,122,0.14)] sm:left-2 sm:h-11 sm:w-11"
        : "absolute left-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--icon-kanji)] bg-[var(--icon-kanji-bg)] text-[var(--icon-kanji)] shadow-[0_8px_20px_rgba(180,83,9,0.12)] transition hover:bg-[rgba(180,83,9,0.14)] sm:left-2 sm:h-11 sm:w-11";
    const nextButtonClassName = isVocabularyCard
        ? "absolute right-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--icon-vocabulary)] bg-[var(--icon-vocabulary-bg)] text-[var(--icon-vocabulary)] shadow-[0_8px_20px_rgba(2,179,122,0.12)] transition hover:bg-[rgba(2,179,122,0.14)] sm:right-2 sm:h-11 sm:w-11"
        : "absolute right-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--icon-kanji)] bg-[var(--icon-kanji-bg)] text-[var(--icon-kanji)] shadow-[0_8px_20px_rgba(180,83,9,0.12)] transition hover:bg-[rgba(180,83,9,0.14)] sm:right-2 sm:h-11 sm:w-11";
    // remove border on small screens for a cleaner mobile appearance
    const shellClassName = "overflow-hidden rounded-2xl sm:border sm:border-[#d6dfef] bg-gradient-to-br from-white via-[#f8fbff] to-[#eef4ff] text-[#1f2d3d] shadow-[0_18px_45px_rgba(15,23,42,0.08)]";
    const summaryShellClassName = "rounded-2xl sm:border sm:border-[#d6dfef] bg-white p-6 text-[#1f2d3d] shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8";
    const flashcardFaceClassName = "box-border flex h-full flex-col items-center justify-center gap-2 overflow-y-auto rounded-2xl sm:border sm:border-[#d8e2f0] bg-gradient-to-br from-white via-[#f8fbff] to-[#edf4ff] px-4 py-4 text-center text-[#1f2d3d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overscroll-contain sm:gap-3 sm:px-10 sm:py-6";
    const practiceFaceClassName = "box-border flex h-full flex-col items-center justify-start gap-2 overflow-y-auto rounded-2xl sm:border sm:border-[#d8e2f0] bg-gradient-to-br from-white via-[#f8fbff] to-[#edf4ff] px-4 py-4 text-center text-[#1f2d3d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overscroll-contain sm:gap-3 sm:px-10 sm:py-6";
    const flashcardBackFaceClassName = "box-border flex h-full flex-col items-center justify-center gap-2 overflow-y-auto rounded-2xl sm:border sm:border-[#d8e2f0] bg-gradient-to-br from-[#fbfdff] via-[#f3f8ff] to-[#e7effd] px-4 py-4 text-center text-[#1f2d3d] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overscroll-contain sm:gap-3 sm:px-10 sm:py-6";
    const chipClassName = "inline-flex max-w-full items-center gap-1 rounded-full bg-[#eaf2ff] px-3 py-1 text-[11px] text-[#355273] sm:mt-2 sm:text-xs";
    const renderKanjiBackContent = (isCentered = false) => (
        <div className={`flex w-full max-w-2xl flex-col ${isCentered ? "items-center text-center" : "items-start text-left"} justify-start gap-4`}>
            {isViToJpMode ? (
                <>
                    <p className={`max-w-full whitespace-pre-line break-words text-sm font-bold leading-tight tracking-wide text-[#1f2d3d] sm:text-base md:text-xl ${isCentered ? "text-center mx-auto" : ""}`}>
                        {currentCard?.meaning || "-"}
                    </p>
                    {!currentCardMedia ? (
                        <p className="break-words text-2xl font-bold leading-tight tracking-wide sm:text-4xl text-center mx-auto">{currentCard?.word || "-"}</p>
                    ) : null}
                    {(currentCard?.hanviet || currentCard?.reading) ? (
                        <p className="max-w-full whitespace-pre-line break-words text-sm font-bold leading-tight tracking-wide text-[#5f748f] sm:text-base md:text-xl text-center mx-auto">
                            {currentCard?.hanviet && `${currentCard.hanviet}`}
                        </p>
                    ) : null}
                    <div className={`mt-2 grid w-full max-w-full gap-2 sm:max-w-xl sm:grid-cols-2 ${isCentered ? "mx-auto" : ""}`}>
                        <div className="rounded-xl border border-[#d8e2f0] bg-[#f8fbff] px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:rounded-2xl sm:px-3 sm:py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f84a0] sm:text-[10px] sm:tracking-[0.22em]">Onyomi</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-tight text-[#1f2d3d] sm:mt-1 sm:text-lg">
                                {currentCard?.onyomi || "-"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#d8e2f0] bg-[#f8fbff] px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:rounded-2xl sm:px-3 sm:py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f84a0] sm:text-[10px] sm:tracking-[0.22em]">Kunyomi</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-tight text-[#1f2d3d] sm:mt-1 sm:text-lg">
                                {currentCard?.kunyomi || "-"}
                            </p>
                        </div>
                    </div>
                    {!(currentCard?.onyomi || currentCard?.kunyomi) && currentCard?.reading ? (
                        <p className="max-w-full whitespace-pre-line break-words text-sm text-[#556b86] sm:text-lg">{currentCard.reading}</p>
                    ) : null}
                </>
            ) : (
                <>
                    <p className="max-w-full whitespace-pre-line break-words text-sm font-bold leading-tight tracking-wide text-[#1f2d3d] sm:text-base md:text-xl text-center mx-auto">{currentCard?.meaning || "-"}</p>

                    {(currentCard?.hanviet || currentCard?.reading) ? (
                        <p className="max-w-full whitespace-pre-line break-words text-sm font-bold leading-tight tracking-wide text-[#5f748f] sm:text-base md:text-xl text-center mx-auto">
                            {currentCard?.hanviet && `${currentCard.hanviet}`}
                        </p>
                    ) : null}
                    <div className={`mt-2 grid w-full max-w-full gap-2 sm:max-w-xl sm:grid-cols-2 ${isCentered ? "mx-auto" : ""}`}>
                        <div className="rounded-xl border border-[#d8e2f0] bg-[#f8fbff] px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:rounded-2xl sm:px-3 sm:py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f84a0] sm:text-[10px] sm:tracking-[0.22em]">Onyomi</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-tight text-[#1f2d3d] sm:mt-1 sm:text-lg">
                                {currentCard?.onyomi || "-"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#d8e2f0] bg-[#f8fbff] px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:rounded-2xl sm:px-3 sm:py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f84a0] sm:text-[10px] sm:tracking-[0.22em]">Kunyomi</p>
                            <p className="mt-0.5 break-words text-xs font-semibold leading-tight text-[#1f2d3d] sm:mt-1 sm:text-lg">
                                {currentCard?.kunyomi || "-"}
                            </p>
                        </div>
                    </div>
                    {!(currentCard?.onyomi || currentCard?.kunyomi) && currentCard?.reading ? (
                        <p className="max-w-full whitespace-pre-line break-words text-sm text-[#556b86] sm:text-lg">{currentCard.reading}</p>
                    ) : null}
                </>
            )}

            {currentCard?.exampleText ? (
                <div className={`mt-3 w-full ${isCentered ? "max-w-xl mx-auto" : ""}`}>
                    <div className="w-full rounded-xl border border-[#d8e2f0] bg-[#f8fbff] px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6f84a0]">Ví dụ</p>
                        <p className="mt-1 whitespace-pre-line break-words text-[12px] leading-snug text-[#1f2d3d]">
                            {currentCard.exampleText}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );

    const renderKanjiBackFace = () => {
        const topContent = currentCardMedia ? (
            <div className="flex w-full max-w-5xl flex-col gap-2 md:grid md:grid-cols-2 md:items-stretch md:gap-4">
                <div className="flex min-h-0 w-full items-start justify-start rounded-2xl border border-transparent bg-transparent px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:min-h-[280px] sm:border-[#d8e2f0] sm:bg-white/80 sm:px-6 sm:py-5">
                    {renderKanjiBackContent(false)}
                </div>
                <div className="flex min-h-0 h-full items-center justify-center overflow-hidden rounded-2xl bg-transparent px-3 py-0 sm:min-h-[280px] sm:px-4 sm:py-3">
                    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-transparent sm:rounded-2xl">
                        { }
                        <img
                            src={currentCardMedia}
                            alt={currentCard?.word || currentCard?.meaning || "media"}
                            className="img-fixed-contain"
                        />
                    </div>
                </div>
            </div>
        ) : (
            renderKanjiBackContent(true)
        );

        return (
            <div className="flex w-full flex-col items-center justify-start gap-4">
                {topContent}
            </div>
        );
    };

    const stopAudio = useCallback(() => {
        if (!canUseSpeech) {
            return;
        }
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [canUseSpeech]);

    const playAudio = useCallback((text) => {
        if (!canUseSpeech || !text) {
            return;
        }

        stopAudio();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ja-JP";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    }, [canUseSpeech, stopAudio]);

    const goNext = useCallback(() => {
        if (!deck.length) {
            return;
        }

        if (currentIndex >= deck.length - 1) {
            stopAudio();
            setShowAnswer(false);
            setShowSummary(true);
            return;
        }

        stopAudio();
        setCurrentIndex((prev) => prev + 1);
        setShowAnswer(false);
    }, [currentIndex, deck.length, stopAudio]);

    const goPrev = useCallback(() => {
        if (!deck.length) {
            return;
        }
        stopAudio();
        setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
        setShowAnswer(false);
    }, [deck.length, stopAudio]);

    const resetDeck = useCallback(() => {
        stopAudio();
        setCurrentIndex(0);
        setShowAnswer(false);
        setCardStatusById({});
        setShowSummary(false);
        setQuizAnswers({});
        setRecallInput("");
        setRecallAnswers({});
        setRecallChecked(false);
        setSessionStartedAt(Date.now());
        completionNotifiedRef.current = false;
    }, [stopAudio]);

    const reviewUnknownCards = useCallback(() => {
        if (!unknownCards.length) {
            return;
        }

        stopAudio();
        setDeck(unknownCards);
        setCurrentIndex(0);
        setShowAnswer(false);
        setCardStatusById({});
        setShowSummary(false);
        setQuizAnswers({});
        setRecallInput("");
        setRecallAnswers({});
        setRecallChecked(false);
        setSessionStartedAt(Date.now());
        completionNotifiedRef.current = false;
    }, [stopAudio, unknownCards]);

    const shuffleDeck = useCallback(() => {
        stopAudio();
        setDeck((prev) => {
            const remainingCards = prev.filter((card) => !cardStatusById[card.id]);
            const markedCards = prev.filter((card) => cardStatusById[card.id]);
            const shuffledRemaining = [...remainingCards];

            for (let i = shuffledRemaining.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = shuffledRemaining[i];
                shuffledRemaining[i] = shuffledRemaining[j];
                shuffledRemaining[j] = temp;
            }

            return [...shuffledRemaining, ...markedCards];
        });
        setCurrentIndex(0);
        setShowAnswer(false);
        setShowSummary(knownCount + unknownCount >= deck.length && deck.length > 0);
        setRecallInput("");
        setRecallChecked(false);
    }, [cardStatusById, deck.length, knownCount, stopAudio, unknownCount]);

    const markCurrentCard = useCallback((status) => {
        if (!currentCard?.id) {
            return;
        }

        setCardStatusById((prev) => ({
            ...prev,
            [currentCard.id]: status,
        }));

        if (deck.length > 1) {
            goNext();
        }
    }, [currentCard?.id, deck.length, goNext]);

    const reviewLastCard = useCallback(() => {
        if (!deck.length) {
            return;
        }

        stopAudio();
        setShowAnswer(false);
        setCurrentIndex(Math.max(deck.length - 1, 0));
        setShowSummary(false);
    }, [deck.length, stopAudio]);

    const selectQuizAnswer = useCallback((option) => {
        if (!currentCard?.id) {
            return;
        }

        setQuizAnswers((prev) => ({
            ...prev,
            [currentCard.id]: option,
        }));
    }, [currentCard?.id]);

    const changeQuizQuestionMode = useCallback((mode) => {
        setQuizQuestionMode(mode);
        setQuizAnswers({});
        setShowAnswer(false);
    }, []);

    const changeRecallQuestionMode = useCallback((mode) => {
        setRecallQuestionMode(mode);
        setRecallInput("");
        setRecallAnswers({});
        setRecallChecked(false);
        setShowAnswer(false);
    }, []);

    const checkRecallAnswer = useCallback(() => {
        if (!currentCard?.id) {
            return;
        }

        const correct = checkMeaningAnswer(recallInput, currentRecallTarget);
        setRecallAnswers((prev) => ({
            ...prev,
            [currentCard.id]: {
                value: recallInput.trim(),
                correct,
            },
        }));
        setRecallChecked(true);
    }, [currentCard?.id, currentRecallTarget, recallInput]);

    useEffect(() => {
        if (!showSummary || !totalCount || completionNotifiedRef.current) {
            return;
        }

        completionNotifiedRef.current = true;

        if (typeof onSessionComplete === "function") {
            onSessionComplete({
                total: totalCount,
                known: knownCount,
                unknown: unknownCount,
                percentage: totalCount ? Math.round((knownCount / totalCount) * 100) : 0,
                durationSeconds: Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)),
                completedAt: new Date().toISOString(),
            });
        }
    }, [showSummary, totalCount, knownCount, unknownCount, sessionStartedAt, onSessionComplete]);

    const toggleDirectionMode = useCallback(() => {
        stopAudio();
        setShowAnswer(false);
        setDirectionMode((prev) => (prev === "jpToVi" ? "viToJp" : "jpToVi"));
    }, [stopAudio]);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (!deck.length) {
                return;
            }

            if (event.code === "Space" && activeStudyMode === "flashcard") {
                event.preventDefault();
                setShowAnswer((prev) => !prev);
            }

            if (event.key === "Enter" && activeStudyMode === "recall") {
                event.preventDefault();
                recallChecked ? goNext() : checkRecallAnswer();
            }

            if (event.key.toLowerCase() === "arrowright") {
                event.preventDefault();
                goNext();
            }

            if (event.key.toLowerCase() === "arrowleft") {
                event.preventDefault();
                goPrev();
            }

            if (event.key.toLowerCase() === "r") {
                event.preventDefault();
                playAudio(getSpeechText(currentCard));
            }

            if (event.key.toLowerCase() === "x") {
                event.preventDefault();
                markCurrentCard("unknown");
            }

            if (event.key.toLowerCase() === "c") {
                event.preventDefault();
                markCurrentCard("known");
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [activeStudyMode, checkRecallAnswer, deck.length, currentCard, getSpeechText, goNext, goPrev, markCurrentCard, playAudio, recallChecked]);

    useEffect(() => () => stopAudio(), [stopAudio]);

    const quizModeOptions = [
        { key: "reading", label: "Cách đọc" },
        ...(isVocabularyCard ? [] : [{ key: "kanji", label: "Kanji" }]),
        { key: "meaning", label: "Ý nghĩa" },
    ];
    const recallModeOptions = [
        { key: "reading", label: "Nhập cách đọc" },
        { key: "meaning", label: "Nhập nghĩa" },
    ];

    const renderPracticeModeSelector = () => {
        if (!isQuizMode && !isRecallMode) {
            return null;
        }

        const options = isQuizMode ? quizModeOptions : recallModeOptions;
        const activeMode = isQuizMode ? quizQuestionMode : recallQuestionMode;
        const changeMode = isQuizMode ? changeQuizQuestionMode : changeRecallQuestionMode;
        const activeClassName = isQuizMode ? "bg-[#11c967] text-white" : "bg-[#f09c6f] text-white";

        return (
            <div className="flex shrink-0 rounded-lg bg-[#23324f] p-0.5 sm:p-1">
                {options.map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => changeMode(option.key)}
                        className={`whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold leading-tight transition sm:px-3 sm:py-1.5 sm:text-xs ${
                            activeMode === option.key
                                ? activeClassName
                                : "text-[#b9c5dc] hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderQuizFace = () => (
        <div className={`${practiceFaceClassName} min-h-[420px] sm:min-h-[360px] md:min-h-[420px]`}>
            <div className="w-full max-w-3xl">
                <p className="mt-3 break-words text-3xl font-bold leading-tight text-[#0f8a46] sm:text-5xl">
                    {quizPromptValue}
                </p>
                {currentCard?.note ? (
                    <p className="mt-2 whitespace-pre-line text-xs text-[#5f748f]">{currentCard.note}</p>
                ) : null}
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {quizOptions.map((option) => {
                        const selected = currentQuizAnswer === option;
                        const answered = Boolean(currentQuizAnswer);
                        const correct = option === correctQuizAnswer;
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => selectQuizAnswer(option)}
                                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                                    selected
                                        ? correct
                                            ? "border-[#0f8a46] bg-[#eaf9ef] text-[#0f8a46]"
                                            : "border-rose-300 bg-rose-50 text-rose-700"
                                        : answered && correct
                                            ? "border-[#0f8a46] bg-[#eaf9ef] text-[#0f8a46]"
                                        : "border-[#d8e2f0] bg-white text-[#1f2d3d] hover:bg-[#f6f9ff]"
                                }`}
                            >
                                {(() => {
                                    if (isVocabularyCard && quizQuestionMode === "reading") {
                                        return <RubyText text={option} className="text-base sm:text-lg" rtClassName="text-[8px] sm:text-[10px] text-[#5f748f]" />;
                                    }
                                    return option;
                                })()}
                            </button>
                        );
                    })}
                </div>
                {!quizOptions.length ? (
                    <p className="mt-4 rounded-xl border border-[#d8e2f0] bg-white px-3 py-3 text-sm font-semibold text-[#5f748f]">
                        Chưa có dữ liệu cho kiểu này.
                    </p>
                ) : null}
                {currentQuizAnswer ? (
                    <button
                        type="button"
                        onClick={goNext}
                        className="mt-5 inline-flex rounded-xl bg-[#74cb94] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                    >
                        {currentIndex >= deck.length - 1 ? t("mockTest.submitTest", "Nộp bài") : t("mockTest.next", "Sau")}
                    </button>
                ) : null}
            </div>
        </div>
    );

    const renderRecallFace = () => (
        <div className={`${practiceFaceClassName} min-h-[420px] sm:min-h-[360px] md:min-h-[420px]`}>
            <div className="w-full max-w-2xl">
                <p className="mt-3 break-words text-3xl font-bold leading-tight text-[#c85a00] sm:text-5xl">
                    {recallPromptValue}
                </p>
                {currentCard?.note ? (
                    <p className="mt-2 whitespace-pre-line text-xs text-[#9a5a22]">{currentCard.note}</p>
                ) : null}
                <div className="mt-6 text-left">
                    <label className="text-sm font-semibold text-[#1f2d3d]">
                        {recallQuestionMode === "reading" ? "Cách đọc" : "Nghĩa"}
                    </label>
                    <input
                        value={recallInput}
                        onChange={(event) => {
                            setRecallInput(event.target.value);
                            setRecallChecked(false);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                recallChecked ? goNext() : checkRecallAnswer();
                            }
                        }}
                        className="form-control mt-2"
                        placeholder={recallQuestionMode === "reading" ? "Nhập cách đọc..." : "Nhập nghĩa..."}
                    />
                </div>
                {recallChecked ? (
                    <div className={`mt-3 rounded-xl border px-3 py-2 text-left text-sm ${currentRecallResult?.correct ? "border-[#86c99d] bg-[#edf9f1] text-[#166534]" : "border-[#e9a3a3] bg-[#fff0f0] text-[#b42318]"}`}>
                        <p className="inline-flex items-center gap-2 font-semibold">
                            {currentRecallResult?.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            {currentRecallResult?.correct ? t("vocabulary.correct", "Đúng") : t("vocabulary.incorrect", "Sai")}
                        </p>
                        <p className="mt-1">{currentRecallTarget || "-"}</p>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={recallChecked ? goNext : checkRecallAnswer}
                    className="mt-5 inline-flex rounded-xl bg-[#f09c6f] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                >
                    {recallChecked
                        ? currentIndex >= deck.length - 1
                            ? t("mockTest.submitTest", "Nộp bài")
                            : t("mockTest.next", "Sau")
                        : t("studySet.checkAnswer", "Kiểm tra")}
                </button>
            </div>
        </div>
    );

    return isFinished && showSummary ? (
        <>
            <div className={summaryShellClassName}>
                <div className="flex flex-col justify-between gap-8 lg:flex-row">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-[#1f2d3d] sm:text-3xl">
                                {t("vocabulary.summaryTitle", "Chúc mừng! Bạn đã ôn tập xong.")}
                            </h2>
                            <p className="mt-2 text-sm text-[#6a7f98]">
                                {t("vocabulary.summarySubtitle", "Bạn đã hoàn thành toàn bộ bộ thẻ trong học phần này.")}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-500 bg-[#f6fbf7]">
                                    <span className="text-xl font-bold text-[#1f2d3d]">{totalCount ? Math.round((knownCount / totalCount) * 100) : 0}%</span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <p className="font-semibold text-emerald-600">
                                        {t("vocabulary.knownCount", "Đã biết")}: <span className="text-[#1f2d3d]">{knownCount}</span>
                                    </p>
                                    <p className="font-semibold text-rose-600">
                                        {t("vocabulary.unknownCount", "Chưa biết")}: <span className="text-[#1f2d3d]">{unknownCount}</span>
                                    </p>
                                    <p className="text-xs text-[#7d90aa]">
                                        {t("vocabulary.totalCards", "Tổng số thẻ")}: {totalCount}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-xs space-y-3">
                        <p className="text-sm font-semibold text-[#6a7f98]">
                            {t("vocabulary.nextStep", "Bước tiếp theo")}
                        </p>
                        <button
                            type="button"
                            onClick={resetDeck}
                            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                        >
                            {t("vocabulary.resetDeck", "Đặt lại Thẻ ghi nhớ")}
                        </button>
                        {unknownCards.length > 0 ? (
                            <button
                                type="button"
                                onClick={reviewUnknownCards}
                                className="inline-flex w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                                {t("vocabulary.reviewUnknownCards", "Học lại từ chưa thuộc")}
                            </button>
                        ) : null}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={reviewLastCard}
                    className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#6a7f98] transition hover:text-[#1f2d3d]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {t("vocabulary.backToLastCard", "Quay lại thẻ cuối cùng")}
                </button>
            </div>

            {modeSwitch ? (
                <div className="rounded-xl border border-[#d8e2f0] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    {modeSwitch}
                </div>
            ) : null}

            <div className="rounded-xl sm:border sm:border-[#d8e2f0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                    {listTitle || t("vocabulary.termsInLesson", "Thuật ngữ trong bài này")}: {deck.length}
                </p>
                <div className="mt-3 space-y-2">
                    {deck.map((item, index) => {
                        const display = getStudySetDisplayLines(item);

                        return (
                        <article
                            key={item.id}
                            className="min-h-[80px] rounded-xl border border-[#d8e2f0] bg-[#f9fbff] p-2.5 text-[#1f2d3d]"
                        >
                            <div className="flex items-start justify-between gap-2.5">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    {!isVocabularyCard ? renderMedia(getFrontFaceMedia(item), item.word || item.kanji || item.meaning || "media", "h-16 w-16 shrink-0") : null}
                                    <div className="shrink-0">
                                        <p className="text-[11px] font-semibold text-[#7d90aa]">{index + 1}.</p>
                                        <p className="font-medium leading-none text-[#1f2d3d]">
                                            <RubyText text={item.word} reading={item.reading} className="text-xl" rtClassName="text-[10px]" />
                                        </p>
                                    </div>

                                    <div className="min-w-0 border-l border-[#d8e2f0] pl-3">
                                        {item.onyomi || item.kunyomi ? (
                                            <div className="space-y-0.5 text-xs leading-tight text-[#5f748f]">
                                                {item.onyomi ? <p>Onyomi: {item.onyomi}</p> : null}
                                                {item.kunyomi ? <p>Kunyomi: {item.kunyomi}</p> : null}
                                            </div>
                                        ) : item.reading ? (
                                            <p className="whitespace-pre-line text-xs leading-tight text-[#5f748f]">{item.reading}</p>
                                        ) : null}
                                        <p className="mt-0.5 whitespace-pre-line break-words text-xs leading-tight text-[#1f2d3d]">{item.meaning}</p>
                                        {isVocabularyCard && getVocabularyExampleText(item) ? (
                                            <RubyText
                                                text={getVocabularyExampleText(item)}
                                                className="mt-1 block whitespace-pre-line break-words text-[14px] leading-snug text-[#5f748f]"
                                                rtClassName="text-[9px]"
                                            />
                                        ) : null}
                                        {showLessonTitle && item.lessonTitle ? (
                                            <p className="mt-1 text-xs text-[#7d90aa]">{item.lessonTitle}</p>
                                        ) : null}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => playAudio(getSpeechText(item))}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#c8d7eb] text-[#355273] transition hover:bg-[#edf4ff]"
                                    title={t("vocabulary.playAudio", "Nghe")}
                                >
                                    <Volume2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </article>
                        );
                    })}
                </div>
            </div>
        </>
    ) : (
        <>
            <div className={shellClassName}>
                <div className="flex items-center justify-center px-2 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        {renderPracticeModeSelector()}
                        <button
                            type="button"
                            onClick={() => playAudio(getSpeechText(currentCard))}
                            title={t("vocabulary.playAudio", "Nghe")}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-[#355273] transition hover:bg-[#dfeafb] sm:h-9 sm:w-9"
                        >
                            <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        {isSpeaking && (
                            <button
                                type="button"
                                onClick={stopAudio}
                                title={t("vocabulary.stopAudio", "Dừng")}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-[#355273] transition hover:bg-[#dfeafb] sm:h-9 sm:w-9"
                            >
                                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                        )}
                        <p className="shrink-0 whitespace-nowrap text-[11px] leading-tight text-[#6a7f98] sm:text-sm">
                            {currentIndex + 1} / {deck.length}
                        </p>
                    </div>
                </div>

                <div className="relative overflow-x-hidden px-2 pb-2 sm:px-4">
                    <button
                        type="button"
                        onClick={goPrev}
                        className={previousButtonClassName}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        className={nextButtonClassName}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>

                    {isQuizMode ? renderQuizFace() : isRecallMode ? renderRecallFace() : (
                    <button
                        type="button"
                        onClick={() => setShowAnswer((prev) => !prev)}
                        className="flashcard-flip-scene w-full overflow-hidden rounded-2xl"
                    >
                        <div className={`flashcard-flip-inner min-h-[420px] sm:min-h-[360px] md:min-h-[420px] ${showAnswer ? "is-flipped" : ""}`}>
                            <div className={`flashcard-face flashcard-face-front ${flashcardFaceClassName}`}>
                                {isVocabularyCard ? (
                                    isViToJpMode ? (
                                        renderVocabularyMeaningFace()
                                    ) : (
                                        renderVocabularyJapaneseFace("front")
                                    )
                                ) : (
                                    <>
                                        {(!isViToJpMode && (currentCard?.drawingImage || currentCard?.mediaUrl || currentCard?.image)) ? (
                                            <div className="flex h-full items-center justify-center">
                                                { }
                                                <img
                                                    src={currentCard.drawingImage || currentCard.mediaUrl || currentCard.image}
                                                    alt={currentCard?.word || currentCard?.kanji || "kanji"}
                                                    className="img-fixed-contain"
                                                />
                                            </div>
                                        ) : (
                                            <p className="break-words text-4xl font-bold leading-tight tracking-wide sm:text-5xl md:text-7xl">
                                                {isViToJpMode ? currentCard?.meaning : currentCard?.word}
                                            </p>
                                        )}
                                        <span className={chipClassName}>
                                            <Volume2 className="h-3.5 w-3.5" />
                                            {t("vocabulary.flipHint", "Bấm Space hoặc chạm thẻ để lật")}
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className={`flashcard-face flashcard-face-back ${flashcardBackFaceClassName}`}>
                                {isVocabularyCard ? (
                                    isViToJpMode ? (
                                        <>
                                            {renderVocabularyJapaneseFace("back")}
                                        </>
                                    ) : (
                                        renderVocabularyMeaningFace()
                                    )
                                ) : isStudySetCard ? (
                                    renderStudySetBackFace()
                                ) : (
                                    renderKanjiBackFace()
                                )}
                                {showLessonTitle && currentCard?.lessonTitle ? (
                                    <span className="mt-2 inline-flex max-w-full rounded-full bg-[#eaf2ff] px-3 py-1 text-xs text-[#355273]">
                                        {currentCard.lessonTitle}
                                    </span>
                                ) : null}
                                {/* example is rendered inside the kanji back content left column */}
                            </div>
                        </div>
                    </button>
                    )}
                </div>

                <div className="px-4 pb-2">
                    <div className="flex h-2 overflow-hidden rounded-full bg-[#e6edf8]">
                        {knownCount > 0 ? (
                            <div
                                className="h-full bg-[#16a34a]"
                                style={{ flex: `${knownCount} 0 0` }}
                            />
                        ) : null}
                        {unknownCount > 0 ? (
                            <div
                                className="h-full bg-[#e11d48]"
                                style={{ flex: `${unknownCount} 0 0` }}
                            />
                        ) : null}
                        {pendingCount > 0 ? (
                            <div
                                className="h-full bg-transparent"
                                style={{ flex: `${pendingCount} 0 0` }}
                            />
                        ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-[#6a7f98]">
                        {t("vocabulary.knownCount", "Thuộc")}: {knownCount} / {totalCount}
                        {" • "}
                        {t("vocabulary.unknownCount", "Chưa thuộc")}: {unknownCount}
                    </p>
                </div>

                <div className="grid grid-cols-1 items-center gap-3 border-t border-[#d8e2f0] bg-[#f6f9ff] px-3 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-4">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6a7f98] sm:gap-2 sm:text-sm sm:justify-self-start">
                        <span>{t("vocabulary.shortcutLabel", "Phím tắt")}:</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[#355273] shadow-sm">Space</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[#355273] shadow-sm">←</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[#355273] shadow-sm">→</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[#355273] shadow-sm">R</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[#355273] shadow-sm">X</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[#355273] shadow-sm">C</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 sm:justify-self-center">
                        <button
                            type="button"
                            onClick={() => markCurrentCard("unknown")}
                            title={t("vocabulary.markUnknown", "Chưa thuộc")}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 shadow-md transition hover:bg-rose-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => markCurrentCard("known")}
                            title={t("vocabulary.markKnown", "Đã thuộc")}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-md transition hover:bg-emerald-200"
                        >
                            <Check className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-self-end">
                        <button
                            type="button"
                            onClick={toggleDirectionMode}
                            title={isViToJpMode
                                ? t("vocabulary.directionViToJp", "Việt -> Nhật")
                                : t("vocabulary.directionJpToVi", "Nhật -> Việt")}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#d8e2f0] bg-white px-2.5 py-1.5 text-xs whitespace-nowrap text-[#355273] transition hover:bg-[#edf4ff]"
                        >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={resetDeck}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#d8e2f0] bg-white px-2.5 py-1.5 text-xs whitespace-nowrap text-[#355273] transition hover:bg-[#edf4ff]"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {t("vocabulary.resetDeck", "Học lại")}
                        </button>
                        <button
                            type="button"
                            onClick={shuffleDeck}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#d8e2f0] bg-white px-2.5 py-1.5 text-xs whitespace-nowrap text-[#355273] transition hover:bg-[#edf4ff]"
                        >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            {t("vocabulary.shuffleDeck", "Trộn thẻ")}
                        </button>
                    </div>
                </div>
            </div>

            {modeSwitch ? (
                <div className="rounded-xl border border-[#d8e2f0] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    {modeSwitch}
                </div>
            ) : null}

            <div className="rounded-xl sm:border sm:border-[#d8e2f0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                    {listTitle || t("vocabulary.termsInLesson", "Thuật ngữ trong bài này")}: {deck.length}
                </p>
                <div className="mt-3 space-y-2">
                    {deck.map((item, index) => {
                        const display = getStudySetDisplayLines(item);

                        return (
                        <article
                            key={item.id}
                            className="min-h-[80px] rounded-xl border border-[#d8e2f0] bg-[#f9fbff] p-2.5 text-[#1f2d3d]"
                        >
                            <div className="flex items-start justify-between gap-2.5">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <div className="shrink-0">
                                        <p className="text-[11px] font-semibold text-[#7d90aa]">{index + 1}.</p>
                                        {!isVocabularyCard && getFrontFaceMedia(item) ? (
                                            <div className="mt-1 overflow-hidden rounded-lg border border-[#d8e2f0] bg-white">
                                                { }
                                                <img
                                                    src={getFrontFaceMedia(item)}
                                                    alt={item.word || item.kanji || item.meaning || "media"}
                                                    className="h-12 w-12 object-cover"
                                                    style={{ objectFit: "cover", width: 48, height: 48 }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="font-medium leading-none text-[#1f2d3d]">
                                                <RubyText text={item.word} reading={item.reading} className="text-xl" rtClassName="text-[10px]" />
                                            </p>
                                        )}
                                    </div>

                                    <div className="min-w-0 space-y-0.5 border-l border-[#d8e2f0] pl-3">
                                        {display.reading ? (
                                            <p className="break-words text-xs leading-tight text-[#5f748f]">{display.reading}</p>
                                        ) : null}
                                        {display.hanviet ? (
                                            <p className="break-words text-xs leading-tight text-[#5f748f]">{display.hanviet}</p>
                                        ) : null}
                                        {(item.onyomi || item.kunyomi) ? (
                                            <div className="mt-1 space-y-0.5 text-xs leading-tight text-[#5f748f]">
                                                {item.onyomi ? <p>Onyomi: {item.onyomi}</p> : null}
                                                {item.kunyomi ? <p>Kunyomi: {item.kunyomi}</p> : null}
                                            </div>
                                        ) : null}
                                        {display.meaning ? (
                                            <p className="whitespace-pre-line break-words text-xs leading-tight text-[#1f2d3d]">{display.meaning}</p>
                                        ) : null}
                                        {isVocabularyCard && getVocabularyExampleText(item) ? (
                                            <RubyText
                                                text={getVocabularyExampleText(item)}
                                                className="mt-1 block whitespace-pre-line break-words text-[14px] leading-snug text-[#5f748f]"
                                                rtClassName="text-[9px]"
                                            />
                                        ) : null}
                                        {showLessonTitle && item.lessonTitle ? (
                                            <p className="mt-1 text-xs text-[#7d90aa]">{item.lessonTitle}</p>
                                        ) : null}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => playAudio(getSpeechText(item))}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#c8d7eb] text-[#355273] transition hover:bg-[#edf4ff]"
                                    title={t("vocabulary.playAudio", "Nghe")}
                                >
                                    <Volume2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </article>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

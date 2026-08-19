"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import RubyText from "@/components/feature/RubyText";
import StudySetModeSwitch from "@/components/feature/StudySetModeSwitch";
import { useLanguage } from "@/hooks/useLanguage";
import { useStudySets } from "@/hooks/useStudySets";

function normalizeCard(card, index) {
    return {
        id: String(card.id || `${card.term || card.word}-${index}`),
        term: String(card.word || card.term || "").trim(),
        reading: String(card.reading || "").trim(),
        meaning: String(card.meaning || "").trim(),
        note: String(card.note || card.example || "").trim(),
    };
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

function splitAcceptedAnswers(value) {
    return String(value || "")
        .split(/[,;\/\n]| - /)
        .map(normalizeAnswer)
        .filter(Boolean);
}

function isCorrectAnswer(input, meaning) {
    const normalizedInput = normalizeAnswer(input);
    if (!normalizedInput) return false;

    const accepted = splitAcceptedAnswers(meaning);
    return accepted.some((answer) => normalizedInput === answer || normalizedInput.includes(answer) || answer.includes(normalizedInput));
}

function shuffle(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
    }
    return next;
}

export default function StudySetRecallPage() {
    const { t } = useLanguage();
    const params = useParams();
    const setId = String(params?.id || "");
    const { isReady, getSetById } = useStudySets();
    const studySet = getSetById(setId);
    const cards = useMemo(() => shuffle((studySet?.cards || []).map(normalizeCard).filter((card) => card.term && card.meaning)), [studySet]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [input, setInput] = useState("");
    const [answers, setAnswers] = useState({});
    const [checked, setChecked] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    const currentCard = cards[currentIndex];
    const currentResult = currentCard ? answers[currentCard.id] : null;
    const correctCount = cards.reduce((total, card) => total + (answers[card.id]?.correct ? 1 : 0), 0);

    const restart = () => {
        setCurrentIndex(0);
        setInput("");
        setAnswers({});
        setChecked(false);
        setShowSummary(false);
    };

    const checkCurrent = () => {
        if (!currentCard) return;
        const correct = isCorrectAnswer(input, currentCard.meaning);
        setAnswers((current) => ({
            ...current,
            [currentCard.id]: {
                value: input.trim(),
                correct,
            },
        }));
        setChecked(true);
    };

    const goNext = () => {
        if (currentIndex >= cards.length - 1) {
            setShowSummary(true);
            return;
        }

        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setInput(answers[cards[nextIndex]?.id]?.value || "");
        setChecked(Boolean(answers[cards[nextIndex]?.id]));
    };

    if (!isReady) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <LoadingState message={t("common.loading", "Dang tai...")} />
            </section>
        );
    }

    if (!studySet) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.notFound", "Khong tim thay hoc phan.")}</p>
                <Link href="/study-set" className="mt-3 inline-flex rounded-lg bg-[var(--icon-studyset-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-studyset)]">
                    {t("studySet.backToSets", "Quay lai danh sach hoc phan")}
                </Link>
            </section>
        );
    }

    if (!cards.length) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.noCards", "Chua co the nao.")}</p>
                <Link href={`/study-set/${studySet._id}`} className="mt-3 inline-flex rounded-lg bg-[#f09c6f] px-3 py-2 text-sm font-semibold text-white">
                    {t("studySet.backToSets", "Quay lai")}
                </Link>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="surface-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#c85a00]">{studySet.name}</p>
                        <h1 className="text-2xl font-black text-[var(--color-text)]">{t("studySet.modeRecall", "Nhoi nhet")}</h1>
                    </div>
                    <Link href={`/study-set/${studySet._id}`} className="back-action inline-flex items-center gap-2 rounded-xl bg-[var(--icon-studyset-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-studyset)]">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
                <div className="mt-4">
                    <StudySetModeSwitch studySetId={studySet._id} activeMode="recall" cardCount={cards.length} t={t} />
                </div>
            </div>

            {showSummary ? (
                <div className="surface-card rounded-2xl p-4 sm:p-5">
                    <p className="text-sm font-semibold text-[var(--color-text-soft)]">{t("mockTest.resultTitle", "Ket qua")}</p>
                    <h2 className="mt-1 text-3xl font-black text-[var(--color-text)]">{correctCount}/{cards.length}</h2>
                    <div className="mt-4 grid gap-2">
                        {cards.map((card, index) => {
                            const result = answers[card.id];
                            return (
                                <div key={card.id} className={`rounded-xl border p-3 text-sm ${result?.correct ? "border-[#86c99d] bg-[#edf9f1]" : "border-[#e9a3a3] bg-[#fff0f0]"}`}>
                                    <p className="font-semibold text-[var(--color-text)]">{index + 1}. {card.term}</p>
                                    <p className="mt-1 text-[var(--color-text-soft)]">{result?.value || t("vocabulary.unanswered", "Chua tra loi")}</p>
                                    <p className="mt-1 font-semibold text-[#166534]">{card.meaning}</p>
                                </div>
                            );
                        })}
                    </div>
                    <button type="button" onClick={restart} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f09c6f] px-4 py-2 text-sm font-semibold text-white">
                        <RotateCcw className="h-4 w-4" />
                        {t("mockTest.retryButton", "Lam lai")}
                    </button>
                </div>
            ) : (
                <div className="surface-card rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--color-text-soft)]">{currentIndex + 1}/{cards.length}</p>
                        <p className="text-sm text-[var(--color-text-soft)]">{Object.keys(answers).length}/{cards.length}</p>
                    </div>
                    <div className="mt-3 rounded-2xl border border-[#ffbf8f] bg-[#fff4ea] p-5 text-center">
                        <RubyText text={currentCard.term} reading={currentCard.reading} className="text-3xl font-black text-[#c85a00]" rtClassName="text-xs" />
                        {currentCard.note ? <p className="mt-3 whitespace-pre-line text-xs text-[#e85f00]">{currentCard.note}</p> : null}
                    </div>
                    <div className="mt-4">
                        <label className="text-sm font-semibold text-[var(--color-text)]">{t("studySet.meaning", "Nghia")}</label>
                        <input
                            value={input}
                            onChange={(event) => {
                                setInput(event.target.value);
                                setChecked(false);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    checked ? goNext() : checkCurrent();
                                }
                            }}
                            className="form-control mt-2"
                            placeholder={t("studySet.meaningPlaceholder", "Nhap nghia...")}
                        />
                    </div>
                    {checked ? (
                        <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${currentResult?.correct ? "border-[#86c99d] bg-[#edf9f1] text-[#166534]" : "border-[#e9a3a3] bg-[#fff0f0] text-[#b42318]"}`}>
                            <p className="inline-flex items-center gap-2 font-semibold">
                                {currentResult?.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                {currentResult?.correct ? t("vocabulary.correct", "Dung") : t("vocabulary.incorrect", "Sai")}
                            </p>
                            <p className="mt-1">{currentCard.meaning}</p>
                        </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap justify-between gap-2">
                        <button type="button" onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} disabled={currentIndex === 0} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40">
                            {t("mockTest.prev", "Truoc")}
                        </button>
                        {checked ? (
                            <button type="button" onClick={goNext} className="rounded-xl bg-[#f09c6f] px-4 py-2 text-sm font-semibold text-white">
                                {currentIndex >= cards.length - 1 ? t("mockTest.submitTest", "Nop bai") : t("mockTest.next", "Sau")}
                            </button>
                        ) : (
                            <button type="button" onClick={checkCurrent} className="rounded-xl bg-[#f09c6f] px-4 py-2 text-sm font-semibold text-white">
                                {t("studySet.checkAnswer", "Kiem tra")}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

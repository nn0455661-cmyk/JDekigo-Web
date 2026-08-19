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

function shuffle(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
    }
    return next;
}

function buildQuestions(cards) {
    const meanings = cards.map((card) => card.meaning).filter(Boolean);

    return shuffle(cards).map((card) => {
        const distractors = shuffle(meanings.filter((meaning) => meaning !== card.meaning)).slice(0, 3);
        return {
            ...card,
            options: shuffle([card.meaning, ...distractors]).filter(Boolean),
        };
    });
}

export default function StudySetQuizPage() {
    const { t } = useLanguage();
    const params = useParams();
    const setId = String(params?.id || "");
    const { isReady, getSetById } = useStudySets();
    const studySet = getSetById(setId);
    const cards = useMemo(() => (studySet?.cards || []).map(normalizeCard).filter((card) => card.term && card.meaning), [studySet]);
    const [seed, setSeed] = useState(0);
    const questions = useMemo(() => {
        void seed;
        return buildQuestions(cards);
    }, [cards, seed]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const currentQuestion = questions[currentIndex];
    const answeredCount = Object.keys(answers).length;
    const correctCount = questions.reduce((total, question) => total + (answers[question.id] === question.meaning ? 1 : 0), 0);

    const restart = () => {
        setSeed((value) => value + 1);
        setCurrentIndex(0);
        setAnswers({});
        setSubmitted(false);
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

    if (!questions.length) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.noCards", "Chua co the nao.")}</p>
                <Link href={`/study-set/${studySet._id}`} className="mt-3 inline-flex rounded-lg bg-[#74cb94] px-3 py-2 text-sm font-semibold text-white">
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0f8a46]">{studySet.name}</p>
                        <h1 className="text-2xl font-black text-[var(--color-text)]">{t("studySet.modeQuiz", "Trac nghiem")}</h1>
                    </div>
                    <Link href={`/study-set/${studySet._id}`} className="back-action inline-flex items-center gap-2 rounded-xl bg-[var(--icon-studyset-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-studyset)]">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
                <div className="mt-4">
                    <StudySetModeSwitch studySetId={studySet._id} activeMode="quiz" cardCount={cards.length} t={t} />
                </div>
            </div>

            {submitted ? (
                <div className="surface-card rounded-2xl p-4 sm:p-5">
                    <p className="text-sm font-semibold text-[var(--color-text-soft)]">{t("mockTest.resultTitle", "Ket qua")}</p>
                    <h2 className="mt-1 text-3xl font-black text-[var(--color-text)]">{correctCount}/{questions.length}</h2>
                    <div className="mt-4 grid gap-2">
                        {questions.map((question, index) => {
                            const isCorrect = answers[question.id] === question.meaning;
                            return (
                                <div key={question.id} className={`rounded-xl border p-3 text-sm ${isCorrect ? "border-[#86c99d] bg-[#edf9f1]" : "border-[#e9a3a3] bg-[#fff0f0]"}`}>
                                    <p className="font-semibold text-[var(--color-text)]">{index + 1}. {question.term}</p>
                                    <p className="mt-1 text-[var(--color-text-soft)]">{answers[question.id] || t("vocabulary.unanswered", "Chua tra loi")}</p>
                                    {!isCorrect ? <p className="mt-1 font-semibold text-[#166534]">{question.meaning}</p> : null}
                                </div>
                            );
                        })}
                    </div>
                    <button type="button" onClick={restart} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#74cb94] px-4 py-2 text-sm font-semibold text-white">
                        <RotateCcw className="h-4 w-4" />
                        {t("mockTest.retryButton", "Lam lai")}
                    </button>
                </div>
            ) : (
                <div className="surface-card rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--color-text-soft)]">{currentIndex + 1}/{questions.length}</p>
                        <p className="text-sm text-[var(--color-text-soft)]">{answeredCount}/{questions.length}</p>
                    </div>
                    <div className="mt-3 rounded-2xl border border-[#98e1b3] bg-[#eaf9ef] p-5 text-center">
                        <RubyText text={currentQuestion.term} reading={currentQuestion.reading} className="text-3xl font-black text-[#0f8a46]" rtClassName="text-xs" />
                        {currentQuestion.note ? <p className="mt-3 whitespace-pre-line text-xs text-[#067647]">{currentQuestion.note}</p> : null}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {currentQuestion.options.map((option) => {
                            const selected = answers[currentQuestion.id] === option;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: option }))}
                                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${selected ? "border-[#0f8a46] bg-[#eaf9ef] text-[#0f8a46]" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]"}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap justify-between gap-2">
                        <button type="button" onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} disabled={currentIndex === 0} className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40">
                            {t("mockTest.prev", "Truoc")}
                        </button>
                        {currentIndex < questions.length - 1 ? (
                            <button type="button" onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))} className="rounded-xl bg-[#74cb94] px-4 py-2 text-sm font-semibold text-white">
                                {t("mockTest.next", "Sau")}
                            </button>
                        ) : (
                            <button type="button" onClick={() => setSubmitted(true)} className="rounded-xl bg-[#74cb94] px-4 py-2 text-sm font-semibold text-white">
                                {t("mockTest.submitTest", "Nop bai")}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

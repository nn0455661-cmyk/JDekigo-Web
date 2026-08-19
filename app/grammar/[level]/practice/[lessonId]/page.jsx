"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import RubyText from "@/components/feature/RubyText";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import {
    normalizeText,
    buildQuestionsForSingleLesson,
    calculateScore,
    getArrangeAnswerText,
    isSameArrangeAnswer,
    hasInlineRubyText,
    stripInlineRubyText,
} from "@/utils/grammarQuestionBuilder";
import * as grammarService from "src/services/grammar.service";

export default function GrammarPracticeRunPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const lessonId = Number(params?.lessonId || 0);

    const [items, setItems] = useState(() => {
        const cached = grammarService.getCachedGrammar();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !grammarService.getCachedGrammar());
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [resultSaved, setResultSaved] = useState(false);
    const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
    const [showFurigana, setShowFurigana] = useState(false);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/grammar/${level}/practice/${lessonId}`);
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
    const lesson = useMemo(() => levelItems.find((item) => Number(item.id) === lessonId), [levelItems, lessonId]);

    const storageKey = useMemo(
        () => `grammar-practice:${level}:${lessonId}`,
        [level, lessonId]
    );
    const historyKey = useMemo(
        () => `grammar-practice-history:${level}`,
        [level]
    );

    const handleSubmit = useCallback(() => {
        setSubmitted(true);
    }, []);

    useEffect(() => {
        if (loading || !lesson) {
            return;
        }

        let restored = false;

        try {
            const savedRaw = localStorage.getItem(storageKey);
            if (savedRaw) {
                const saved = JSON.parse(savedRaw);
                if (Array.isArray(saved.questions) && saved.questions.length > 0) {
                    const restoredQuestions = saved.questions;
                    const restoredAnswers = Array.isArray(saved.answers)
                        ? saved.answers.slice(0, restoredQuestions.length)
                        : new Array(restoredQuestions.length).fill(null);

                    setQuestions(restoredQuestions);
                    setAnswers(restoredAnswers);
                    setCurrentIndex(Math.max(0, Math.min(Number(saved.currentIndex) || 0, restoredQuestions.length - 1)));
                    setResultSaved(Boolean(saved.resultSaved));
                    setSubmitted(Boolean(saved.submitted));
                    restored = true;
                }
            }
        } catch {
            restored = false;
        }

        if (!restored) {
            const nextQuestions = buildQuestionsForSingleLesson(lesson, 10);

            setQuestions(nextQuestions);
            setCurrentIndex(0);
            setAnswers(new Array(nextQuestions.length).fill(null));
            setSubmitted(false);
            setResultSaved(false);
            setShowFurigana(false);
        }
    }, [loading, lesson, levelItems, storageKey]);

    useEffect(() => {
        if (loading || !questions.length) {
            return;
        }

        const payload = {
            questions,
            answers,
            currentIndex,
            submitted,
            resultSaved,
        };

        localStorage.setItem(storageKey, JSON.stringify(payload));
    }, [loading, questions, answers, currentIndex, submitted, resultSaved, storageKey]);

    const currentQuestion = questions[currentIndex] || null;

    const answeredCount = useMemo(
        () =>
            questions.filter((question, index) => {
                const answer = answers[index];

                if (question.type === "arrange") {
                    return Array.isArray(answer) && answer.length === question.pieces.length && question.pieces.length > 0;
                }

                return answer !== null && answer !== undefined && String(answer).trim() !== "";
            }).length,
        [answers, questions]
    );

    const getArrangeAnswerText = (question, selectedPieceIds) => {
        if (!Array.isArray(selectedPieceIds) || !selectedPieceIds.length) return "";
        const selectedPieces = selectedPieceIds
            .map((pieceId) => question.pieces.find((piece) => piece.id === pieceId))
            .filter(Boolean);
        return selectedPieces.map((piece) => piece.text).join(" ");
    };

    const scoreInfo = useMemo(() => {
        const result = calculateScore(questions, answers);
        return result;
    }, [answers, questions]);

    const hasFurigana = useMemo(
        () => questions.some((q) =>
            Boolean(q.reading) ||
            hasInlineRubyText(q.prompt || "") ||
            hasInlineRubyText(q.question || "") ||
            hasInlineRubyText(q.formulaWithBlank || "") ||
            hasInlineRubyText(q.sourceText || "") ||
            hasInlineRubyText(q.reference || "") ||
            (Array.isArray(q.options) && q.options.some((o) => hasInlineRubyText(o || ""))) ||
            (Array.isArray(q.pieces) && q.pieces.some((p) => hasInlineRubyText(p.text || "")))
        ),
        [questions]
    );

    useEffect(() => {
        if (!submitted || resultSaved || scoreInfo.total === 0 || !lesson) {
            return;
        }

        try {
            const existingRaw = localStorage.getItem(historyKey);
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            const next = Array.isArray(existing) ? existing : [];

            next.unshift({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: "practice",
                lessonId,
                lessonTitle: lesson.title,
                correct: scoreInfo.correct,
                total: scoreInfo.total,
                percentage: scoreInfo.percentage,
                durationSeconds: 0,
                createdAt: new Date().toISOString(),
            });

            localStorage.setItem(historyKey, JSON.stringify(next.slice(0, 10)));
            setResultSaved(true);
        } catch {
            // Ignore localStorage parse/set failures to keep the flow uninterrupted.
        }
    }, [submitted, resultSaved, scoreInfo, historyKey, lessonId, lesson]);

    const chooseAnswer = (value) => {
        if (submitted) {
            return;
        }

        setAnswers((prev) => {
            const next = [...prev];
            next[currentIndex] = value;
            return next;
        });
    };

    const addArrangePiece = (pieceId) => {
        if (submitted) return;
        setAnswers((prev) => {
            const next = [...prev];
            const current = Array.isArray(next[currentIndex]) ? next[currentIndex] : [];
            next[currentIndex] = [...current, pieceId];
            return next;
        });
    };

    const removeArrangePiece = (pieceId) => {
        if (submitted) return;
        setAnswers((prev) => {
            const next = [...prev];
            const current = Array.isArray(next[currentIndex]) ? next[currentIndex] : [];
            next[currentIndex] = current.filter((id) => id !== pieceId);
            return next;
        });
    };

    const clearCurrentAnswer = () => {
        if (submitted) return;
        setAnswers((prev) => {
            const next = [...prev];
            next[currentIndex] = currentQuestion.type === "arrange" ? [] : null;
            return next;
        });
    };

    const chooseFillAnswer = (option) => {
        if (submitted) return;
        setAnswers((prev) => {
            const next = [...prev];
            const current = normalizeText(next[currentIndex]);
            const selected = current === normalizeText(option);
            next[currentIndex] = selected ? null : option;
            return next;
        });
    };

    const restartPractice = () => {
        if (!lesson) return;

        const nextQuestions = buildQuestionsForSingleLesson(lesson, 10);
        setQuestions(nextQuestions);
        setCurrentIndex(0);
        setAnswers(new Array(nextQuestions.length).fill(null));
        setSubmitted(false);
        setResultSaved(false);
    };

    const confirmStopPractice = () => {
        localStorage.removeItem(storageKey);
        setStopConfirmOpen(false);
        router.push(`/grammar/${level}`);
    };

    const renderQuestionBody = () => {
        if (!currentQuestion) return null;

        if (currentQuestion.type === "arrange") {
            const selectedPieceIds = Array.isArray(answers[currentIndex]) ? answers[currentIndex] : [];
            const selectedPieces = selectedPieceIds
                .map((pieceId) => currentQuestion.pieces.find((piece) => piece.id === pieceId))
                .filter(Boolean);
            const arrangeCompleted = currentQuestion.pieces.length > 0 && selectedPieceIds.length === currentQuestion.pieces.length;
            const arrangeAnswerText = arrangeCompleted ? getArrangeAnswerText(currentQuestion, selectedPieceIds) : "";
            const arrangeIsCorrect = arrangeCompleted && isSameArrangeAnswer(arrangeAnswerText, currentQuestion.correctAnswer);

            return (
                <>
                    <div>
                        <p className="text-sm font-semibold text-[var(--color-text-soft)]">{t("grammar.questionLabel", "Câu")} {currentIndex + 1}</p>
                        <p className="mt-1 text-lg font-bold text-[var(--color-text)]">{t("grammar.arrangeTitle", "Sắp xếp đúng ngữ pháp")}</p>
                    </div>

                    <div className="rounded-2xl border border-[#ffc98f] bg-[#fff1df] p-3 shadow-[0_1px_0_rgba(255,107,0,0.04)]">
                        <p className="text-sm font-semibold text-[#9a4f00]">{t("grammar.selectedAnswerFrame", "Khung đáp án đã chọn")}</p>
                        <div className="mt-2 flex min-h-[56px] flex-wrap gap-2 rounded-xl border border-dashed border-[#ffc98f] bg-transparent p-2">
                            {selectedPieces.length === 0 ? (
                                <span className="text-sm text-[#b47a33]">{t("grammar.notSelected", "Chưa chọn")}</span>
                            ) : (
                                selectedPieces.map((piece) => (
                                    <button
                                        key={piece.id}
                                        type="button"
                                        onClick={() => removeArrangePiece(piece.id)}
                                        className="inline-flex w-fit items-center rounded-full bg-transparent px-3 py-1 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-bg-soft)]"
                                    >
                                        <RubyText
                                            text={piece.text}
                                            className="leading-none"
                                            rtClassName="text-[10px] text-[var(--color-text-soft)]"
                                        />
                                    </button>
                                ))
                            )}
                        </div>
                        {arrangeCompleted ? (
                            <div className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${arrangeIsCorrect ? "border-[#86c99d] bg-[#edf9f1] text-[#166534]" : "border-[#e9a3a3] bg-[#fff0f0] text-[#b42318]"}`}>
                                <div className="flex items-center gap-2">
                                    {arrangeIsCorrect ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                    <span>{arrangeIsCorrect ? t("grammar.correct", "Đúng") : t("grammar.incorrect", "Sai")}</span>
                                </div>
                                {!arrangeIsCorrect ? (
                                    <p className="mt-1 text-xs font-medium">
                                        {t("grammar.correctAnswer", "Đáp án đúng:")} <RubyText text={currentQuestion.correctAnswer} showFurigana={showFurigana} className="inline" />
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-[var(--color-text-soft)]">{t("grammar.tokenLabel", "Từ / ký tự")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {currentQuestion.pieces.filter((piece) => !selectedPieceIds.includes(piece.id)).map((piece) => {
                                const selected = selectedPieceIds.includes(piece.id);

                                return (
                                    <button
                                        key={piece.id}
                                        type="button"
                                        onClick={() => addArrangePiece(piece.id)}
                                        disabled={selected}
                                        className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition ${selected ? "cursor-not-allowed border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] opacity-100" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]"}`}
                                    >
                                        <RubyText
                                            text={piece.text}
                                            className="leading-none"
                                            rtClassName="text-[10px] text-[var(--color-text-soft)]"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-2 pt-2">
                        <button
                            type="button"
                            onClick={clearCurrentAnswer}
                            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
                        >
                            {t("grammar.clearAnswer", "Xóa đáp án")}
                        </button>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50"
                            >
                                {t("grammar.prevQuestion", "Câu trước")}
                            </button>

                            {currentIndex < questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                                >
                                    {t("grammar.nextQuestion", "Câu tiếp")}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                                >
                                    {t("grammar.submitTest", "Nộp bài")}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            );
        }

        return (
            <>
                <div>
                    <p className="text-sm font-semibold text-[var(--color-text-soft)]">{t("grammar.questionLabel", "Câu")} {currentIndex + 1}</p>
                    <RubyText
                        text={currentQuestion.question || currentQuestion.prompt || currentQuestion.formulaWithBlank}
                        className="mt-1 block text-lg font-bold text-[var(--color-text)]"
                        rtClassName="text-[11px] text-[var(--color-text-soft)]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {currentQuestion.options.map((option) => {
                        const selected = normalizeText(answers[currentIndex]) === normalizeText(option);

                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => chooseFillAnswer(option)}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${selected ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]"}`}
                            >
                                <span className="whitespace-pre-line text-xs font-semibold text-[var(--color-text)] sm:text-sm">
                                    {showFurigana ? (
                                        <RubyText
                                            text={option}
                                            className="leading-none"
                                            rtClassName="text-[10px] text-[var(--color-text-soft)]"
                                            showFurigana={showFurigana}
                                        />
                                    ) : (
                                        stripInlineRubyText(option)
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50"
                    >
                        {t("grammar.prevQuestion", "Câu trước")}
                    </button>

                    {currentIndex < questions.length - 1 ? (
                        <button
                            type="button"
                            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                        >
                            {t("grammar.nextQuestion", "Câu tiếp")}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                        >
                            {t("grammar.submitTest", "Nộp bài")}
                        </button>
                    )}
                </div>
            </>
        );
    };

    return (
        <section className="dashboard-shell space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="section-title">
                        {t("grammar.practiceRunTitle", "Luyện tập ngữ pháp")} - {level}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {hasFurigana ? (
                        <button
                            type="button"
                            onClick={() => setShowFurigana((current) => !current)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${showFurigana ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)]"}`}
                        >
                            {showFurigana ? "Ẩn furigana" : "Hiện furigana"}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setStopConfirmOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-grammar-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-grammar)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("grammar.stopPracticeButton", "Dừng bài tập")}
                    </button>
                </div>
            </div>

            {loading ? (
                <LoadingState message={t("grammar.loading", "Đang tải điểm ngữ pháp...")} />
            ) : !lesson ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("grammar.practiceLessonNotFound", "Không tìm thấy bài ngữ pháp.")}
                </p>
            ) : questions.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("grammar.practiceNoQuestions", "Bài này chưa đủ dữ liệu để tạo bài tập.")}
                </p>
            ) : submitted ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{t("grammar.practiceResultTitle", "Kết quả bài tập")}</p>
                    <p className="mt-2 text-3xl font-black text-[var(--color-text)]">{scoreInfo.correct}/{scoreInfo.total}</p>
                    <p className="mt-1 text-base text-[var(--color-text-soft)]">
                        {t("grammar.percentageLabel", "Tỷ lệ đúng")}: {scoreInfo.percentage}%
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={restartPractice}
                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                        >
                            {t("grammar.retryPractice", "Làm lại bài tập")}
                        </button>
                        <Link
                            href={`/grammar/${level}`}
                            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
                        >
                            {t("grammar.backToPracticeList", "Về lại danh sách bài học")}
                        </Link>
                    </div>

                    <div className="mt-5 space-y-3">
                        {questions.map((question, index) => {
                            const userAnswer = question.type === "arrange"
                                ? getArrangeAnswerText(question, Array.isArray(answers[index]) ? answers[index] : [])
                                : normalizeText(answers[index]);
                            const isCorrect = question.type === "arrange"
                                ? isSameArrangeAnswer(userAnswer, question.correctAnswer)
                                : normalizeText(userAnswer) === normalizeText(question.correctAnswer);

                            return (
                                <div
                                    key={question.id}
                                    className={`rounded-2xl border p-4 ${isCorrect ? "border-[#9bd6af] bg-[#f2fbf4]" : "border-[#f1b0b0] bg-[#fff3f3]"}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-[var(--color-text)]">{t("grammar.questionLabel", "Câu")} {index + 1}</p>
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isCorrect ? "text-[#166534]" : "text-[#b42318]"}`}>
                                            <CheckCircle2 className="h-4 w-4" />
                                            {isCorrect ? t("grammar.correct", "Đúng") : t("grammar.incorrect", "Sai")}
                                        </span>
                                    </div>
                                    {showFurigana && (question.sourceText || question.reference || question.formulaWithBlank) ? (
                                        <RubyText
                                            text={question.sourceText || question.reference || question.formulaWithBlank}
                                            className="mt-2 block text-sm text-[var(--color-text)]"
                                            rtClassName="text-[10px] text-[var(--color-text-soft)]"
                                        />
                                    ) : (
                                        <p className="mt-2 text-sm text-[var(--color-text)]">
                                            {question.type === "arrange" ? question.prompt : question.formulaWithBlank}
                                        </p>
                                    )}
                                    <p className="mt-2 text-sm text-[var(--color-text)]">
                                        <span className="font-semibold">{t("grammar.yourAnswer", "Đáp án của bạn:")}</span> {userAnswer || t("grammar.unanswered", "Chưa trả lời")}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--color-text)]">
                                        <span className="font-semibold">{t("grammar.correctAnswer", "Đáp án đúng:")}</span> {question.correctAnswer}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-3">
                        {hasFurigana ? (
                            <button
                                type="button"
                                onClick={() => setShowFurigana((current) => !current)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${showFurigana ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)]"}`}
                            >
                                {showFurigana ? "Ẩn furigana" : "Hiện furigana"}
                            </button>
                        ) : null}
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                            <div
                                className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                            />
                        </div>
                        <p className="shrink-0 text-sm text-[var(--color-text-soft)]">
                            {t("grammar.answeredLabel", "Đã làm")}: {answeredCount}/{questions.length}
                        </p>
                        {showFurigana && (currentQuestion.question || currentQuestion.prompt || currentQuestion.formulaWithBlank || currentQuestion.sourceText || currentQuestion.reference) ? (
                            <RubyText
                                text={currentQuestion.question || currentQuestion.prompt || currentQuestion.formulaWithBlank || currentQuestion.sourceText || currentQuestion.reference}
                                className="mt-1 block text-lg font-bold text-[var(--color-text)]"
                                rtClassName="text-[11px] text-[var(--color-text-soft)]"
                            />
                        ) : (
                            <p className="mt-1 text-lg font-bold text-[var(--color-text)]">{t("grammar.arrangeTitle", "Sắp xếp đúng ngữ pháp")}</p>
                        )}
                    </div>

                    {currentQuestion && renderQuestionBody()}
                    {showFurigana && (currentQuestion.sourceText || currentQuestion.reference || currentQuestion.formulaWithBlank) ? (
                        <RubyText
                            text={currentQuestion.sourceText || currentQuestion.reference || currentQuestion.formulaWithBlank}
                            className="mt-1 block text-lg font-bold text-[var(--color-text)]"
                            rtClassName="text-[11px] text-[var(--color-text-soft)]"
                        />
                    ) : (
                        <p className="mt-1 text-lg font-bold text-[var(--color-text)]">{currentQuestion.formulaWithBlank}</p>
                    )}
                </div>
            )}

            {stopConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <p className="inline-flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
                                <AlertTriangle className="h-4 w-4 text-[var(--color-primary)]" />
                                {t("grammar.stopPracticeButton", "Dừng bài tập")}
                            </p>
                            <button
                                type="button"
                                onClick={() => setStopConfirmOpen(false)}
                                aria-label={t("grammar.cancel", "Hủy")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-4 py-4">
                            <p className="text-sm text-[var(--color-text-soft)]">
                                {t("grammar.stopPracticeConfirm", "Bạn có chắc muốn dừng bài tập hiện tại?")}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setStopConfirmOpen(false)}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]"
                            >
                                {t("grammar.cancel", "Hủy")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmStopPractice}
                                className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
                            >
                                {t("grammar.stopPracticeButton", "Dừng bài tập")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

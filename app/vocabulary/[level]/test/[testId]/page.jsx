"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Dumbbell, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/src/shared/hooks/useAuth";
import LoadingState from "@/components/LoadingState";
import RubyText from "@/components/feature/RubyText";
import QuestionExplanation from "@/components/feature/QuestionExplanation";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import { getTestById } from "@/src/services/test.service";
import { saveLocalTestHistory, saveTestHistory } from "@/src/services/history.service";
import { setExamNavigationLock } from "@/src/services/exam-lock.service";
import { hasInlineRubyText, stripInlineRubyText } from "@/utils/grammarQuestionBuilder";
import Image from "next/image";


function buildQuestionsFromTest(testItem) {
    if (!testItem || !Array.isArray(testItem.questions)) {
        return [];
    }

    return testItem.questions.map((question, index) => {
        const options = Array.isArray(question.options) ? question.options : [];
        const rawCorrect = String(question.correctAnswer || "").trim();
        const letterIndex = rawCorrect.length === 1 ? "ABCD".indexOf(rawCorrect.toUpperCase()) : -1;
        const correctAnswer = letterIndex >= 0 ? (options[letterIndex] || rawCorrect) : rawCorrect;

        return {
            id: question.id || `q-${index + 1}`,
            prompt: question.question || question.prompt || question.formulaWithBlank || "",
            reading: question.reading || "",
            mediaUrl: question.mediaUrl || "",
            questionType: "admin",
            options,
            correctAnswer,
            explanation: question.explanation || "",
        };
    });
}

export default function VocabularyTestRunPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const testId = String(params?.testId || "");
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testLoading, setTestLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [resultSaved, setResultSaved] = useState(false);
    const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
    const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
    const [showFurigana, setShowFurigana] = useState(false);
    const furiganaInitializedRef = useRef(false);

    useEffect(() => {
        if (rawLevel !== level) {
            const query = searchParams.toString();
            router.replace(query ? `/vocabulary/${level}/test/${testId}?${query}` : `/vocabulary/${level}/test/${testId}`);
            return;
        }

        setLoading(false);
    }, [rawLevel, level, testId, router, searchParams]);

    useEffect(() => {
        let mounted = true;

        const fetchTest = async () => {
            setTestLoading(true);

            try {
                const payload = await getTestById(testId, { status: "published" });
                const item = payload?.data?.item || null;
                if (mounted) {
                    setTestData(item?.module === "vocabulary" && item?.level === level ? item : null);
                }
            } catch {
                if (mounted) {
                    setTestData(null);
                }
            } finally {
                if (mounted) {
                    setTestLoading(false);
                }
            }
        };

        fetchTest();

        return () => {
            mounted = false;
        };
    }, [level, testId]);

    const hasDbTest = Boolean(testData?.questions?.length);

    const testConfig = useMemo(() => {
        if (hasDbTest) {
            return {
                title: testData?.testTitle || t("vocabulary.testSetupTitle", "Đề kiểm tra từ vựng"),
                count: testData?.questions?.length || 0,
                mode: "admin",
            };
        }
        return { title: t("vocabulary.testSetupTitle", "Đề kiểm tra từ vựng"), count: 0, mode: "admin" };
    }, [hasDbTest, testData, t]);

    const storageKey = useMemo(
        () => `vocabulary-test:${level}:${testId}`,
        [level, testId]
    );

    const historyKey = useMemo(
        () => `vocabulary-test-history:${level}`,
        [level]
    );

    useEffect(() => {
        if (loading || testLoading) {
            return;
        }

        const adminQuestions = buildQuestionsFromTest(testData);

        if (!adminQuestions.length) {
            setQuestions([]);
            setCurrentIndex(0);
            setAnswers([]);
            setSubmitted(false);
            setResultSaved(false);
            return;
        }

        const expectedCount = adminQuestions.length;
        let restored = false;

        try {
            const savedRaw = localStorage.getItem(storageKey);
            if (savedRaw) {
                const saved = JSON.parse(savedRaw);
                if (Array.isArray(saved.questions) && saved.questions.length === expectedCount) {
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
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
        } catch {
            restored = false;
        }

        if (!restored) {
            setQuestions(adminQuestions);
            setCurrentIndex(0);
            setAnswers(new Array(adminQuestions.length).fill(null));
            setSubmitted(false);
            setResultSaved(false);
            setShowFurigana(false);
        }
    }, [loading, testLoading, testData, storageKey]);

    const handleSubmit = useCallback(() => {
        setSubmitted(true);
    }, []);

    const requestSubmit = () => {
        setSubmitConfirmOpen(true);
    };

    const confirmSubmit = () => {
        setSubmitConfirmOpen(false);
        handleSubmit();
    };

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

    useEffect(() => {
        const locked = questions.length > 0 && !submitted;
        setExamNavigationLock(locked);

        return () => {
            setExamNavigationLock(false);
        };
    }, [questions.length, submitted]);

    const currentQuestion = questions[currentIndex] || null;

    const hasFurigana = useMemo(
        () => questions.some((question) => (
            Boolean(question.reading)
            || hasInlineRubyText(question.prompt || "")
            || (Array.isArray(question.options) && question.options.some((option) => hasInlineRubyText(option)))
        )),
        [questions]
    );

    useEffect(() => {
        if (!hasFurigana) {
            setShowFurigana(false);
            furiganaInitializedRef.current = false;
            return;
        }

        if (!furiganaInitializedRef.current) {
            setShowFurigana(true);
            furiganaInitializedRef.current = true;
        }
    }, [hasFurigana]);

    const answeredCount = useMemo(
        () =>
            questions.filter((question, index) => {
                const answer = answers[index];
                return answer !== null && answer !== undefined && String(answer).trim() !== "";
            }).length,
        [answers, questions]
    );

    const scoreInfo = useMemo(() => {
        const total = questions.length;
        const correct = questions.reduce((acc, question, index) => {
            return acc + (answers[index] === question.correctAnswer ? 1 : 0);
        }, 0);
        const percentage = total ? Math.round((correct / total) * 100) : 0;
        return { total, correct, percentage };
    }, [answers, questions]);

    useEffect(() => {
        if (!submitted || resultSaved || scoreInfo.total === 0) {
            return;
        }

        const saveProcess = async () => {
            const historyItem = {
                type: "test",
                level,
                testId,
                testTitle: testConfig.title,
                title: testConfig.title,
                correct: scoreInfo.correct,
                total: scoreInfo.total,
                percentage: scoreInfo.percentage,
                durationSeconds: 0,
                questions,
                answers,
            };

            if (user) {
                try {
                    await saveTestHistory({
                        module: "vocabulary",
                        ...historyItem,
                    });
                } catch (err) {
                    saveLocalTestHistory("vocabulary", level, historyItem);
                }
            } else {
                saveLocalTestHistory("vocabulary", level, historyItem);
            }
            setResultSaved(true);
        };

        saveProcess();
    }, [
        submitted,
        resultSaved,
        scoreInfo,
        historyKey,
        testId,
        testConfig.title,
        questions,
        answers,
        user,
        level,
    ]);

    const chooseAnswer = (value) => {
        if (submitted || (answers[currentIndex] !== null && answers[currentIndex] !== undefined)) {
            return;
        }

        setAnswers((prev) => {
            const next = [...prev];
            next[currentIndex] = value;
            return next;
        });
    };

    const restartTest = () => {
        const nextQuestions = buildQuestionsFromTest(testData);
        setQuestions(nextQuestions);
        setCurrentIndex(0);
        setAnswers(new Array(nextQuestions.length).fill(null));
        setSubmitted(false);
        setResultSaved(false);
    };

    const stopTest = () => {
        setStopConfirmOpen(true);
    };

    const confirmStopTest = () => {
        localStorage.removeItem(storageKey);
        setStopConfirmOpen(false);
        router.push(`/vocabulary/${level}`);
    };

    return (
        <section className="dashboard-shell space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="section-title">{testConfig.title} - {level}</h1>
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
                        onClick={stopTest}
                        className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-vocabulary-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-vocabulary)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("vocabulary.stopTestButton", "Dừng kiểm tra")}
                    </button>
                </div>
            </div>

            {loading || testLoading ? (
                <LoadingState message={t("vocabulary.loading", "Đang tải từ vựng...")} />
            ) : questions.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Chưa có bài kiểm tra được tạo từ admin cho phần này.
                </p>
            ) : submitted ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{t("vocabulary.testResultTitle", "Kết quả bài kiểm tra")}</p>
                    <p className="mt-1 text-3xl font-black text-[var(--color-text)]">{scoreInfo.correct}/{scoreInfo.total}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-soft)]">{t("vocabulary.percentageLabel", "Tỷ lệ đúng")}: {scoreInfo.percentage}%</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={restartTest}
                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                        >
                            {t("vocabulary.retryTest", "Làm lại đề")}
                        </button>
                        <Link
                            href={`/vocabulary/${level}`}
                            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
                        >
                            Quay lại
                        </Link>
                    </div>

                    <div className="mt-4 space-y-2">
                        {questions.map((question, index) => {
                            const userAnswer = answers[index];
                            const isCorrect = userAnswer === question.correctAnswer;

                            return (
                                <div
                                    key={question.id}
                                    className={`rounded-2xl border p-3 ${isCorrect ? "border-[#9bd6af] bg-[#f2fbf4]" : "border-[#f1b0b0] bg-[#fff3f3]"}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-[var(--color-text)]">{t("vocabulary.questionLabel", "Câu")} {index + 1}</p>
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isCorrect ? "text-[#166534]" : "text-[#b42318]"}`}>
                                            <CheckCircle2 className="h-4 w-4" />
                                            {isCorrect ? t("vocabulary.correct", "Đúng") : t("vocabulary.incorrect", "Sai")}
                                        </span>
                                    </div>
                                    <div className="mt-1 space-y-2">
                                        {question.mediaUrl ? (
                                            <Image
                                                src={question.mediaUrl}
                                                alt={question.prompt}
                                                className="max-h-48 w-full rounded-xl border border-[var(--color-border)] object-contain bg-white"
                                                width={800}
                                                height={600}
                                                style={{ objectFit: "contain" }}
                                            />
                                        ) : null}
                                        {showFurigana ? (
                                            <RubyText
                                                text={question.prompt}
                                                reading={question.reading}
                                                className="block whitespace-pre-line text-xs leading-relaxed text-[var(--color-text)] sm:text-sm"
                                                rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[10px]"
                                                showFurigana={showFurigana}
                                            />
                                        ) : (
                                            <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--color-text)] sm:text-sm">{stripInlineRubyText(question.prompt)}</p>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--color-text)] sm:text-sm">
                                        <span className="font-semibold">{t("vocabulary.yourAnswer", "Đáp án của bạn:")}</span> {userAnswer ? stripInlineRubyText(userAnswer) : t("vocabulary.unanswered", "Chưa trả lời")}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--color-text)] sm:text-sm">
                                        <span className="font-semibold">{t("vocabulary.correctAnswer", "Đáp án đúng:")}</span> {stripInlineRubyText(question.correctAnswer)}
                                    </p>
                                    <QuestionExplanation explanation={question.explanation} showFurigana={showFurigana} className="mt-3" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                            <div
                                className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                            />
                        </div>
                        <p className="shrink-0 text-sm text-[var(--color-text-soft)]">
                            {t("vocabulary.answeredLabel", "Đã làm")}: {answeredCount}/{questions.length}
                        </p>
                    </div>

                    {currentQuestion && (
                        <>
                            <div>
                                <p className="text-[11px] font-semibold text-[var(--color-text-soft)] sm:text-sm">
                                    {t("vocabulary.questionLabel", "Câu")} {currentIndex + 1}
                                </p>
                                <div className="mt-1 space-y-3">
                                    {currentQuestion.mediaUrl ? (
                                        <Image
                                            src={currentQuestion.mediaUrl}
                                            alt={currentQuestion.prompt}
                                            className="max-h-56 w-full rounded-2xl border border-[var(--color-border)] object-contain bg-white p-2"
                                            width={900}
                                            height={700}
                                            style={{ objectFit: "contain" }}
                                        />
                                    ) : null}
                                    {showFurigana ? (
                                        <RubyText
                                            text={currentQuestion.prompt}
                                            reading={currentQuestion.reading}
                                            className="block whitespace-pre-line text-xs font-semibold leading-relaxed text-[var(--color-text)] sm:text-lg"
                                            rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[11px]"
                                            showFurigana={showFurigana}
                                        />
                                    ) : (
                                        <h2 className="whitespace-pre-line text-xs font-semibold leading-relaxed text-[var(--color-text)] sm:text-lg">{stripInlineRubyText(currentQuestion.prompt)}</h2>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                {currentQuestion.options.map((option, optIndex) => {
                                    const selected = answers[currentIndex] === option;
                                    const answered = answers[currentIndex] !== null && answers[currentIndex] !== undefined;
                                    const isCorrectOption = option === currentQuestion.correctAnswer;
                                    const isWrongSelection = answered && selected && !isCorrectOption;
                                    const optionClassName = answered && isCorrectOption
                                        ? "border-[#86c99d] bg-[#edf9f1] font-semibold text-[#166534]"
                                        : isWrongSelection
                                            ? "border-[#e9a3a3] bg-[#fff0f0] font-semibold text-[#b42318]"
                                            : "border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]";
                                    return (
                                        <button
                                            key={`${currentQuestion.id}__${optIndex}`}
                                            type="button"
                                            onClick={() => chooseAnswer(option)}
                                            disabled={answered}
                                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs transition sm:text-sm ${answered ? "cursor-default" : ""} ${optionClassName}`}
                                        >
                                            <span className="whitespace-pre-line">
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
                                            {answered && isCorrectOption ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : null}
                                            {isWrongSelection ? <X className="h-5 w-5 shrink-0" /> : null}
                                        </button>
                                    );
                                })}
                            </div>

                            {answers[currentIndex] !== null && answers[currentIndex] !== undefined ? (
                                <QuestionExplanation explanation={currentQuestion.explanation} showFurigana={showFurigana} />
                            ) : null}

                            <div className="flex flex-wrap justify-between gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={currentIndex === 0}
                                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50"
                                >
                                    {t("vocabulary.prevQuestion", "Câu trước")}
                                </button>

                                <div className="flex gap-2">
                                    {currentIndex < questions.length - 1 ? (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            {t("vocabulary.nextQuestion", "Câu tiếp")}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={requestSubmit}
                                            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            {t("vocabulary.submitTest", "Nộp bài")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {stopConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <p className="inline-flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
                                <AlertTriangle className="h-4 w-4 text-[var(--color-primary)]" />
                                {t("vocabulary.stopTestButton", "Dừng kiểm tra")}
                            </p>
                            <button
                                type="button"
                                onClick={() => setStopConfirmOpen(false)}
                                aria-label={t("vocabulary.cancel", "Hủy")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-4 py-4">
                            <p className="text-sm text-[var(--color-text-soft)]">
                                {t("vocabulary.stopTestConfirm", "Bạn có chắc muốn dừng kiểm tra?")}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setStopConfirmOpen(false)}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]"
                            >
                                {t("vocabulary.cancel", "Hủy")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmStopTest}
                                className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
                            >
                                {t("vocabulary.stopTestButton", "Dừng kiểm tra")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {submitConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <p className="inline-flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
                                <ClipboardCheck className="h-4 w-4 text-[var(--color-primary)]" />
                                {t("vocabulary.submitTest", "Nộp bài")}
                            </p>
                            <button
                                type="button"
                                onClick={() => setSubmitConfirmOpen(false)}
                                aria-label={t("vocabulary.cancel", "Hủy")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-4 py-4">
                            <p className="text-sm text-[var(--color-text-soft)]">
                                {t("vocabulary.submitTestConfirm", "Bạn có chắc muốn nộp bài? Sau khi nộp sẽ xem kết quả ngay.")}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setSubmitConfirmOpen(false)}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]"
                            >
                                {t("vocabulary.cancel", "Hủy")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmSubmit}
                                className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white"
                            >
                                {t("vocabulary.submitTest", "Nộp bài")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}


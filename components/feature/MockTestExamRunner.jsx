"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Flag,
    FlagOff,
    PanelRightOpen,
    X,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import RubyText from "@/components/feature/RubyText";
import QuestionExplanation from "@/components/feature/QuestionExplanation";
import { hasInlineRubyText, stripInlineRubyText } from "@/utils/grammarQuestionBuilder";
import { useAuth } from "@/src/shared/hooks/useAuth";
import { saveLocalTestHistory, saveTestHistory } from "@/src/services/history.service";

function formatTime(totalSeconds) {
    const safe = Math.max(0, totalSeconds);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getQuestionKey(level, testId) {
    return `mock-test:${level}:${testId}`;
}

const EXAM_LOCK_STORAGE_KEY = "jlearn_exam_lock";
const EXAM_LOCK_EVENT = "jlearn:exam-lock-change";

function setExamNavigationLock(locked) {
    try {
        if (locked) {
            sessionStorage.setItem(EXAM_LOCK_STORAGE_KEY, "1");
        } else {
            sessionStorage.removeItem(EXAM_LOCK_STORAGE_KEY);
        }
    } catch {
        // Ignore storage failures; the event still updates mounted UI.
    }

    window.dispatchEvent(new CustomEvent(EXAM_LOCK_EVENT, { detail: { locked } }));
}

function shuffle(array) {
    const copied = [...array];
    for (let index = copied.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
    }
    return copied;
}

export default function MockTestExamRunner({ level, testId, title, minutes, questions, testKind = "module_exam", miniTestGroupId = "", mockTestType = "full" }) {
    const { user } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    const storageKey = useMemo(() => getQuestionKey(level, testId), [level, testId]);

    const [questionItems, setQuestionItems] = useState([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState(() => new Array(questions.length).fill(null));
    const [flags, setFlags] = useState(() => new Array(questions.length).fill(false));
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(minutes * 60);
    const [attemptEndAt, setAttemptEndAt] = useState(null);
    const timerRef = useRef(null);
    const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [resultSaved, setResultSaved] = useState(false);
    const [resultInfoLocal, setResultInfoLocal] = useState(null);
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const [showFurigana, setShowFurigana] = useState(false);
    const furiganaInitializedRef = useRef(false);
    const initializedAttemptKeyRef = useRef("");
    const historySaveInFlightRef = useRef(false);
    useEffect(() => {
        const locked = questionItems.length > 0 && !submitted;
        setExamNavigationLock(locked);

        return () => {
            setExamNavigationLock(false);
        };
    }, [questionItems.length, submitted]);

    const hasFurigana = useMemo(() => {
        return questionItems.some((q) =>
            Boolean(q.reading) ||
            hasInlineRubyText(q.prompt || "") ||
            (Array.isArray(q.options) && q.options.some((o) => hasInlineRubyText(o || "")))
        );
    }, [questionItems]);

    useEffect(() => {
        if (!furiganaInitializedRef.current && hasFurigana) {
            setShowFurigana(true);
            furiganaInitializedRef.current = true;
        }
    }, [hasFurigana]);

    useEffect(() => {
        const attemptKey = `${storageKey}:${questions.length}`;
        if (initializedAttemptKeyRef.current === attemptKey) {
            return;
        }
        initializedAttemptKeyRef.current = attemptKey;

        let restored = false;

        try {
            const savedRaw = localStorage.getItem(storageKey);
            if (savedRaw) {
                const saved = JSON.parse(savedRaw);
                if (Array.isArray(saved.answers) && saved.answers.length === questions.length) {
                    const restoredEndAt = Number(saved.endAt);
                    const restoredQuestions = Array.isArray(saved.questions) && saved.questions.length === questions.length ? saved.questions : shuffle([...questions]);
                    setQuestionItems(restoredQuestions);
                    setCurrentIndex(Math.max(0, Math.min(Number(saved.currentIndex) || 0, questions.length - 1)));
                    setAnswers(saved.answers.slice(0, questions.length));
                    setFlags(Array.isArray(saved.flags) ? saved.flags.slice(0, questions.length) : new Array(questions.length).fill(false));
                    setSubmitted(Boolean(saved.submitted));
                    setAttemptEndAt(restoredEndAt);
                    setResultSaved(Boolean(saved.resultSaved));
                    setTimeLeft(Number.isFinite(restoredEndAt) ? Math.max(0, Math.floor((restoredEndAt - Date.now()) / 1000)) : minutes * 60);
                    restored = true;
                }
            }
        } catch {
            restored = false;
        }

        if (!restored) {
            const endAt = Date.now() + minutes * 60 * 1000;
            setQuestionItems(shuffle([...questions]));
            setCurrentIndex(0);
            setAnswers(new Array(questions.length).fill(null));
            setFlags(new Array(questions.length).fill(false));
            setSubmitted(false);
            setResultSaved(false);
            setAttemptEndAt(endAt);
            setTimeLeft(minutes * 60);
        }
    }, [minutes, questions, questions.length, storageKey]);

    useEffect(() => {
        if (submitted || !attemptEndAt) {
            return;
        }

        timerRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.floor((attemptEndAt - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                setSubmitted(true);
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [attemptEndAt, submitted]);

    useEffect(() => {
        if (!attemptEndAt || submitted) {
            return;
        }

        const payload = {
            questions: questionItems,
            currentIndex,
            answers,
            flags,
            submitted,
            endAt: attemptEndAt,
            resultSaved,
        };

        localStorage.setItem(storageKey, JSON.stringify(payload));
    }, [answers, attemptEndAt, currentIndex, flags, questionItems, resultSaved, storageKey, submitted]);

    useEffect(() => {
        if (!submitted) {
            return;
        }

        setMobilePanelOpen(false);

        try {
            localStorage.removeItem(storageKey);
        } catch {
            // Ignore storage failures; the UI already reflects the submitted state.
        }
    }, [storageKey, submitted]);

    useEffect(() => {
        if (submitted || questionItems.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
                        const id = entry.target.id;
                        if (id) {
                            const index = parseInt(id.replace("question-", ""), 10) - 1;
                            if (!isNaN(index) && index >= 0) {
                                setCurrentIndex(index);
                            }
                        }
                    }
                });
            },
            {
                root: null,
                rootMargin: "-20% 0px -40% 0px",
                threshold: 0.5,
            }
        );

        const timer = setTimeout(() => {
            questionItems.forEach((_, index) => {
                const el = document.getElementById(`question-${index + 1}`);
                if (el) observer.observe(el);
            });
        }, 300);

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [questionItems, submitted]);

    const answeredCount = useMemo(
        () => answers.filter((answer) => answer !== null && answer !== undefined && String(answer).trim() !== "").length,
        [answers]
    );

    const scoreInfo = useMemo(() => {
        const correct = questionItems.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);
        return {
            total: questionItems.length,
            correct,
            percentage: questionItems.length ? Math.round((correct / questionItems.length) * 100) : 0,
        };
    }, [answers, questionItems]);

    useEffect(() => {
        if (!submitted || resultSaved || scoreInfo.total === 0) {
            return;
        }

        if (historySaveInFlightRef.current) {
            return;
        }

        historySaveInFlightRef.current = true;

        const saveProcess = async () => {
            const historyItem = {
                type: "mock-test",
                mockTestType,
                testKind,
                miniTestGroupId,
                level,
                testId,
                testTitle: title,
                title,
                questions: questionItems,
                answers,
                correct: scoreInfo.correct,
                total: scoreInfo.total,
                percentage: scoreInfo.percentage,
                durationSeconds: Math.max(0, minutes * 60 - timeLeft),
            };

            if (user) {
                try {
                    await saveTestHistory({
                        module: "mock-test",
                        ...historyItem,
                    });
                } catch (err) {
                    saveLocalTestHistory("mock-test", level, historyItem);
                }
            } else {
                saveLocalTestHistory("mock-test", level, historyItem);
            }

            setResultSaved(true);
        };

        saveProcess().catch((err) => {
            setResultSaved(true);
        });
    }, [
        level,
        minutes,
        resultSaved,
        scoreInfo,
        submitted,
        testId,
        testKind,
        timeLeft,
        title,
        questionItems,
        answers,
        miniTestGroupId,
        mockTestType,
        user,
    ]);

    const chooseAnswer = (questionIndex, value) => {
        if (submitted) {
            return;
        }

        setAnswers((prev) => {
            const next = [...prev];
            next[questionIndex] = next[questionIndex] === value ? null : value;
            return next;
        });

        setCurrentIndex(questionIndex);
    };

    const toggleFlag = (questionIndex) => {
        if (submitted) {
            return;
        }

        setFlags((prev) => {
            const next = [...prev];
            next[questionIndex] = !next[questionIndex];
            return next;
        });
    };

    const requestSubmit = () => setConfirmSubmitOpen(true);
    const requestCancel = () => setConfirmCancelOpen(true);

    const confirmSubmit = () => {
        setConfirmSubmitOpen(false);
        // stop timer to avoid any race that restarts or auto-submits
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        // compute immediate score snapshot so UI shows it reliably
        const total = questionItems.length;
        const correct = questionItems.reduce((totalCorr, question, idx) => (answers[idx] === question.answer ? totalCorr + 1 : totalCorr), 0);
        setResultInfoLocal({ total, correct, percentage: total ? Math.round((correct / total) * 100) : 0 });
        setTimeLeft(0);
        try {
            localStorage.setItem(`${storageKey}:submitted`, "1");
        } catch {
            // ignore storage errors
        }
        setSubmitted(true);
    };

    const scrollToQuestion = (questionIndex) => {
        setCurrentIndex(questionIndex);
        setMobilePanelOpen(false);
        document.getElementById(`question-${questionIndex + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const cancelAttempt = () => {
        try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}:submitted`);
        } catch {
            // Ignore storage failures and still navigate back to the selection page.
        }

        setConfirmSubmitOpen(false);
        setConfirmCancelOpen(false);
        router.replace("/mock-test");
    };

    const restartAttempt = () => {
        try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}:submitted`);
        } catch {
            // ignore
        }

        // clear any running timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // reset questions and state for a new attempt without navigating away
        setQuestionItems(shuffle([...questions]));
        setAnswers(new Array(questions.length).fill(null));
        setFlags(new Array(questions.length).fill(false));
        setSubmitted(false);
        setResultSaved(false);
        setResultInfoLocal(null);
        historySaveInFlightRef.current = false;
        furiganaInitializedRef.current = false;
        const endAt = Date.now() + minutes * 60 * 1000;
        setAttemptEndAt(endAt);
        setTimeLeft(minutes * 60);
    };

    const badgeForIndex = (index) => {
        const answer = answers[index];
        if (submitted) {
            return answer === questionItems[index]?.answer ? "bg-emerald-500 text-white" : "bg-rose-500 text-white";
        }
        if (index === currentIndex) {
            return "bg-[var(--color-primary)] text-white";
        }
        if (flags[index]) {
            return "bg-amber-500 text-white";
        }
        if (answer !== null && answer !== undefined && String(answer).trim() !== "") {
            return "bg-[rgba(255,107,0,0.14)] text-[var(--color-primary)] border border-[rgba(255,107,0,0.18)]";
        }
        return "bg-[var(--color-surface)] text-[var(--color-text-soft)]";
    };

    const displayResult = resultInfoLocal || scoreInfo;

    if (questionItems.length === 0) {
        return (
            <section className="surface-card rounded-3xl border border-[var(--color-border)] p-6 text-[var(--color-text)] shadow-[var(--shadow-card)]">
                <p className="text-sm text-[var(--color-text-soft)]">{t("mockTest.examEmpty", "Không có dữ liệu câu hỏi cho bài kiểm tra này.")}</p>
            </section>
        );
    }

    return (
        <section className="space-y-2.5 max-sm:-mx-2">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)] max-sm:rounded-2xl max-sm:px-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.dedicatedLabel", "Kiểm tra riêng")}</p>
                        <h1 className="mt-0.5 text-2xl font-black text-[var(--color-text)]">{title}</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {hasFurigana ? (
                            <button
                                type="button"
                                onClick={() => setShowFurigana((current) => !current)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${showFurigana ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)]"}`}
                            >
                                {showFurigana ? "Ẩn furigana" : "Hiện furigana"}
                            </button>
                        ) : null}
                        <span className="chip">{level}</span>
                        <span className="chip">{questionItems.length} {t("mockTest.questionUnit", "câu")}</span>
                        <span className="chip">{minutes} {t("mockTest.minuteUnit", "phút")}</span>
                    </div>
                </div>
            </div>

            {submitted ? (
                <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)]">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.resultTitle", "Kết quả")}</p>
                            <h3 className="mt-0.5 text-xl font-black text-[var(--color-text)]">{displayResult.correct}/{displayResult.total} {t("mockTest.correctCountLabel", "câu đúng")}</h3>
                        </div>
                        <div className="rounded-2xl bg-[var(--color-bg-soft)] px-4 py-2 text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">{t("mockTest.accuracyLabel", "Độ chính xác")}</p>
                            <p className="text-2xl font-black text-[var(--color-text)]">{displayResult.percentage}%</p>
                        </div>
                    </div>
                </article>
            ) : null}

            <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-3.5">
                    <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-card)] max-sm:rounded-2xl max-sm:px-3 max-sm:py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.questionListTitle", "Danh sách câu hỏi")}</p>
                            </div>
                        </div>

                        {submitted ? (
                            <div className="mt-3 rounded-2xl border border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] px-4 py-3 text-sm text-[var(--color-text)]">
                                {t("mockTest.submittedHint", "Đã nộp bài. Kết quả từng câu sẽ hiển thị trong danh sách bên dưới.")}
                            </div>
                        ) : null}

                        <div className="mt-3.5 space-y-3.5">
                            {questionItems.map((question, questionIndex) => {
                                const selected = answers[questionIndex];
                                const isCorrect = submitted && selected === question.answer;
                                const isWrong = submitted && selected !== null && selected !== question.answer;

                                return (
                                    <article
                                        key={question.id}
                                        id={`question-${questionIndex + 1}`}
                                        className={`rounded-3xl border px-4 py-4 transition max-sm:rounded-2xl max-sm:px-3 max-sm:py-3 ${questionIndex === currentIndex ? "border-[var(--color-primary)] shadow-[0_10px_28px_rgba(255,107,0,0.08)]" : "border-[rgba(255,165,0,0.22)] bg-[var(--color-surface)]"}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.questionLabel", "Câu")} {questionIndex + 1}</p>

                                            <button
                                                type="button"
                                                onClick={() => toggleFlag(questionIndex)}
                                                aria-label={flags[questionIndex] ? t("mockTest.unflag", "Bỏ gắn cờ") : t("mockTest.flag", "Gắn cờ")}
                                                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${flags[questionIndex]
                                                    ? "border-[rgba(255,165,0,0.55)] bg-[rgba(255,165,0,0.18)] text-[#d97706] shadow-[0_0_0_4px_rgba(255,165,0,0.08)]"
                                                    : "border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-soft)]"
                                                    }`}
                                            >
                                                {flags[questionIndex] ? <Flag className="h-4 w-4" /> : <FlagOff className="h-4 w-4" />}
                                            </button>
                                        </div>

                                        <div className="mt-3 px-1 py-0.5">
                                            {showFurigana ? (
                                                <RubyText
                                                    text={question.prompt}
                                                    reading={question.reading}
                                                    className="block whitespace-pre-line text-[11px] font-semibold leading-relaxed text-[var(--color-text)] sm:text-lg"
                                                    rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[11px]"
                                                    showFurigana={showFurigana}
                                                />
                                            ) : (
                                                <p className="whitespace-pre-line text-[11px] font-semibold leading-relaxed text-[var(--color-text)] sm:text-lg">{stripInlineRubyText(question.prompt)}</p>
                                            )}
                                        </div>

                                        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
                                            {question.options.map((option, optIndex) => {
                                                const optionSelected = selected === option;
                                                const optionCorrect = submitted && option === question.answer;
                                                const optionWrong = submitted && optionSelected && option !== question.answer;

                                                return (
                                                    <button
                                                        key={`${question.id}__${optIndex}`}
                                                        type="button"
                                                        onClick={() => chooseAnswer(questionIndex, option)}
                                                        className={`flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${optionSelected ? "border-[var(--color-primary)] bg-[rgba(255,107,0,0.08)] shadow-[0_8px_24px_rgba(255,107,0,0.12)]" : "border-[rgba(255,165,0,0.28)] bg-[var(--color-surface)]"
                                                            } ${optionCorrect ? "ring-2 ring-emerald-400/70" : ""} ${optionWrong ? "ring-2 ring-rose-400/70" : ""}`}
                                                    >
                                                        <span className={`whitespace-pre-line text-xs font-semibold sm:text-sm ${optionSelected && !submitted ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"}`}>
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
                                                        {optionCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
                                                        {optionWrong ? <AlertTriangle className="h-5 w-5 text-rose-500" /> : null}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {submitted ? (
                                            <QuestionExplanation
                                                explanation={question.explanation}
                                                showFurigana={showFurigana}
                                                className="mt-4"
                                            />
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>

                    </article>
                </div>

                <aside className="hidden space-y-4 lg:sticky lg:top-4 lg:block lg:self-start">
                    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-primary)]">
                                <Clock3 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.timerLabel", "Đếm giờ")}</p>
                                <p className="text-3xl font-black text-[var(--color-text)]">{formatTime(timeLeft)}</p>
                            </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                            <div
                                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                                style={{ width: `${Math.max(0, Math.min(100, (timeLeft / (minutes * 60)) * 100))}%` }}
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-card)]">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.orderLabel", "Thứ tự câu")}</p>
                            </div>
                        </div>

                        <div className="mt-3.5 grid grid-cols-6 gap-2 sm:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6">
                            {questions.map((question, index) => (
                                <button
                                    key={question.id}
                                    type="button"
                                    onClick={() => scrollToQuestion(index)}
                                    className={`relative flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition ${badgeForIndex(index)}`}
                                >
                                    {index + 1}
                                    {flags[index] ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white/90" /> : null}
                                </button>
                            ))}
                        </div>
                    </div>

                    {submitted ? (
                        <div className="flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={restartAttempt}
                                className="w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,0,0.18)]"
                            >
                                {t("mockTest.retryButton", "Làm lại bài")}
                            </button>
                            <Link
                                href="/mock-test"
                                className="flex w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                {t("mockTest.backToSelection", "Về trang chọn đề")}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => scrollToQuestion(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                {t("mockTest.prev", "Trước")}
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToQuestion(Math.min(questionItems.length - 1, currentIndex + 1))}
                                disabled={currentIndex === questionItems.length - 1}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40"
                            >
                                {t("mockTest.next", "Sau")}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={requestCancel}
                                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)]"
                            >
                                {t("mockTest.cancelAttempt", "Hủy làm")}
                            </button>
                            <button
                                type="button"
                                onClick={requestSubmit}
                                className="rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,0,0.18)]"
                            >
                                {t("mockTest.submitTest", "Nộp bài")}
                            </button>
                        </div>
                    )}
                </aside>
            </div>

            {!submitted ? (
                <button
                    type="button"
                    onClick={() => setMobilePanelOpen(true)}
                    className="fixed right-0 top-1/2 z-40 inline-flex -translate-y-1/2 items-center gap-2 rounded-l-2xl bg-[var(--color-primary)] px-2.5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(255,107,0,0.28)] lg:hidden"
                    aria-label={t("mockTest.openQuestionPanel", "Mở bảng theo dõi")}
                >
                    <PanelRightOpen className="h-5 w-5" />
                    <span className="sr-only">{t("mockTest.openQuestionPanel", "Mở bảng theo dõi")}</span>
                </button>
            ) : null}

            {mobilePanelOpen ? (
                <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] lg:hidden">
                    <button
                        type="button"
                        aria-label={t("mockTest.cancel", "Hủy")}
                        className="absolute inset-0 h-full w-full"
                        onClick={() => setMobilePanelOpen(false)}
                    />
                    <aside className="absolute right-2 top-1/2 flex max-h-[86vh] w-[min(88vw,330px)] -translate-y-1/2 flex-col gap-2.5 overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5 shadow-[-18px_0_44px_rgba(47,42,36,0.18)]">
                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-card)]">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.orderLabel", "Thứ tự câu")}</p>
                                <p className="text-sm font-bold text-[var(--color-text)]">{answeredCount}/{questionItems.length}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobilePanelOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]"
                                aria-label={t("mockTest.cancel", "Hủy")}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-bg-soft)] text-[var(--color-primary)]">
                                    <Clock3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{t("mockTest.timerLabel", "Đếm giờ")}</p>
                                    <p className="text-2xl font-black text-[var(--color-text)]">{formatTime(timeLeft)}</p>
                                </div>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                                <div
                                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                                    style={{ width: `${Math.max(0, Math.min(100, (timeLeft / (minutes * 60)) * 100))}%` }}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2.5 shadow-[var(--shadow-card)]">
                            <div className="grid grid-cols-6 gap-1.5">
                                {questions.map((question, index) => (
                                    <button
                                        key={question.id}
                                        type="button"
                                        onClick={() => scrollToQuestion(index)}
                                        className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-semibold transition ${badgeForIndex(index)}`}
                                    >
                                        {index + 1}
                                        {flags[index] ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white/90" /> : null}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => scrollToQuestion(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                {t("mockTest.prev", "Trước")}
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollToQuestion(Math.min(questionItems.length - 1, currentIndex + 1))}
                                disabled={currentIndex === questionItems.length - 1}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)] disabled:opacity-40"
                            >
                                {t("mockTest.next", "Sau")}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={requestCancel}
                                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text)]"
                            >
                                {t("mockTest.cancelAttempt", "Hủy làm")}
                            </button>
                            <button
                                type="button"
                                onClick={requestSubmit}
                                className="rounded-2xl bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,0,0.18)]"
                            >
                                {t("mockTest.submitTest", "Nộp bài")}
                            </button>
                        </div>
                    </aside>
                </div>
            ) : null}

            {confirmSubmitOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,120,0,0.1)] text-[var(--color-primary)]">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[var(--color-text)]">{t("mockTest.submitConfirmTitle", "Nộp bài kiểm tra?")}</h3>
                                <p className="text-sm text-[var(--color-text-soft)]">{t("mockTest.submitConfirmDesc", "Bạn sẽ không sửa được bài sau khi nộp.")}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmSubmitOpen(false)}
                                className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
                            >
                                {t("mockTest.cancel", "Hủy")}
                            </button>
                            <button
                                type="button"
                                onClick={confirmSubmit}
                                className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                            >
                                {t("mockTest.submitTest", "Nộp bài")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {confirmCancelOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,120,0,0.1)] text-[var(--color-primary)]">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[var(--color-text)]">{t("mockTest.cancelConfirmTitle", "Hủy làm bài kiểm tra?")}</h3>
                                <p className="text-sm text-[var(--color-text-soft)]">{t("mockTest.cancelConfirmDesc", "Mọi câu trả lời hiện tại sẽ bị mất.")}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmCancelOpen(false)}
                                className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
                            >
                                {t("mockTest.cancel", "Hủy")}
                            </button>
                            <button
                                type="button"
                                onClick={cancelAttempt}
                                className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                            >
                                {t("mockTest.cancelAttempt", "Hủy làm")}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

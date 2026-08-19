"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import RubyText from "@/components/feature/RubyText";
import QuestionExplanation from "@/components/feature/QuestionExplanation";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import {
    normalizeText,
    getArrangeAnswerText,
    calculateScore,
    hasInlineRubyText,
    stripInlineRubyText,
    repairMojibakeText,
    isSameArrangeAnswer,
} from "@/utils/grammarQuestionBuilder";
import { getTestById } from "@/src/services/test.service";
import { saveLocalTestHistory, saveTestHistory } from "@/src/services/history.service";
import { useAuth } from "@/src/shared/hooks/useAuth";
import { setExamNavigationLock } from "@/src/services/exam-lock.service";

function normalizeAdminQuestion(question, index) {
    const rawType = question.type === "arrangement" ? "arrange" : question.type;
    const options = Array.isArray(question.options) ? question.options.map(repairMojibakeText) : [];
    const rawCorrect = repairMojibakeText(question.correctAnswer || question.correctSentence || "").trim();
    const letterIndex = rawCorrect.length === 1 ? "ABCD".indexOf(rawCorrect.toUpperCase()) : -1;
    const correctAnswer = letterIndex >= 0 ? (options[letterIndex] || rawCorrect) : rawCorrect;

    return {
        ...question,
        id: question.id || `q-${index + 1}`,
        type: rawType || "multiple_choice",
        question: repairMojibakeText(question.question || question.prompt || question.formulaWithBlank || ""),
        prompt: repairMojibakeText(question.prompt || question.question || ""),
        formulaWithBlank: repairMojibakeText(question.formulaWithBlank || question.question || question.prompt || ""),
        options,
        correctAnswer,
        pieces: Array.isArray(question.pieces)
            ? question.pieces.map((piece) => ({ ...piece, text: repairMojibakeText(piece?.text || "") }))
            : [],
        reading: repairMojibakeText(question.reading || ""),
        explanation: repairMojibakeText(question.explanation || ""),
    };
}

function buildQuestionsFromTest(testItem) {
    return Array.isArray(testItem?.questions)
        ? testItem.questions.map(normalizeAdminQuestion)
        : [];
}

export default function GrammarDemoTestRunPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const testId = String(params?.testId || "");

    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [submitted, setSubmitted] = useState(false);
    const [resultSaved, setResultSaved] = useState(false);
    const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
    const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
    const [showFurigana, setShowFurigana] = useState(false);
    const furiganaInitializedRef = useRef(false);

    // Fetch test data
    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/grammar/${level}/test/${testId}`);
            return;
        }

        let mounted = true;

        const fetchTest = async () => {
            setLoading(true);
            try {
                const payload = await getTestById(testId, { status: "published" });
                const item = payload?.data?.item || null;
                if (mounted) {
                    setTestData(item?.module === "grammar" && item?.level === level ? item : null);
                }
            } catch {
                if (mounted) setTestData(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchTest();
        return () => { mounted = false; };
    }, [rawLevel, level, testId, router]);

    const testConfig = useMemo(() => ({
        title: testData?.testTitle || "Bài kiểm tra ngữ pháp",
    }), [testData]);

    const storageKey = useMemo(() => `grammar-test:${level}:${testId}`, [level, testId]);

    const handleSubmit = useCallback(() => { setSubmitted(true); }, []);
    const requestSubmit = () => setSubmitConfirmOpen(true);
    const confirmSubmit = () => { setSubmitConfirmOpen(false); handleSubmit(); };

    // Restore or init questions from test data
    useEffect(() => {
        if (loading) return;

        const adminQuestions = buildQuestionsFromTest(testData);

        if (!adminQuestions.length) {
            setQuestions([]);
            setCurrentIndex(0);
            setAnswers([]);
            setSubmitted(false);
            setResultSaved(false);
            return;
        }

        let restored = false;
        try {
            const savedRaw = localStorage.getItem(storageKey);
            if (savedRaw) {
                const saved = JSON.parse(savedRaw);
                if (Array.isArray(saved.questions) && saved.questions.length === adminQuestions.length) {
                    const restoredQuestions = saved.questions.map(normalizeAdminQuestion);
                    const restoredAnswers = Array.isArray(saved.answers)
                        ? saved.answers.slice(0, restoredQuestions.length).map((answer) =>
                            typeof answer === "string" ? repairMojibakeText(answer) : answer
                        )
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
    }, [loading, testData, storageKey]);

    // Persist progress to localStorage
    useEffect(() => {
        if (loading || !questions.length) return;
        localStorage.setItem(storageKey, JSON.stringify({ questions, answers, currentIndex, submitted, resultSaved }));
    }, [loading, questions, answers, currentIndex, submitted, resultSaved, storageKey]);

    // Nav lock
    useEffect(() => {
        const locked = questions.length > 0 && !submitted;
        setExamNavigationLock(locked);
        return () => setExamNavigationLock(false);
    }, [questions.length, submitted]);

    const currentQuestion = questions[currentIndex] || null;

    const answeredCount = useMemo(() =>
        questions.filter((question, index) => {
            const answer = answers[index];
            if (question.type === "arrange") {
                return Array.isArray(answer) && answer.length === question.pieces.length && question.pieces.length > 0;
            }
            return answer !== null && answer !== undefined && String(answer).trim() !== "";
        }).length,
        [answers, questions]
    );

    const scoreInfo = useMemo(() => calculateScore(questions, answers), [answers, questions]);

    const hasFurigana = useMemo(() =>
        questions.some((question) => {
            if (Boolean(question.reading)) return true;
            const mainText = question.question || question.prompt || question.formulaWithBlank || "";
            if (hasInlineRubyText(mainText)) return true;
            if (Array.isArray(question.options) && question.options.some((o) => hasInlineRubyText(o))) return true;
            if (Array.isArray(question.pieces) && question.pieces.some((p) => hasInlineRubyText(p.text))) return true;
            return false;
        }),
        [questions]
    );

    useEffect(() => {
        if (!furiganaInitializedRef.current && hasFurigana) {
            setShowFurigana(true);
            furiganaInitializedRef.current = true;
        }
    }, [hasFurigana]);

    // Save result to DB (if logged in) after submit
    useEffect(() => {
        if (!submitted || resultSaved || scoreInfo.total === 0) return;

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
                        module: "grammar",
                        ...historyItem,
                    });
                } catch (err) {
                    saveLocalTestHistory("grammar", level, historyItem);
                }
            } else {
                saveLocalTestHistory("grammar", level, historyItem);
            }
            setResultSaved(true);
        };

        saveProcess();
    }, [submitted, resultSaved, scoreInfo, testId, testConfig.title, questions, answers, user, level]);

    // Answer handlers
    const chooseFillAnswer = (value) => {
        if (submitted || !currentQuestion || !["fill", "multiple_choice", "listening"].includes(currentQuestion.type)) return;
        if (normalizeText(answers[currentIndex]) !== "") return;
        setAnswers((prev) => { const next = [...prev]; next[currentIndex] = value; return next; });
    };

    const addArrangePiece = (pieceId) => {
        if (submitted || !currentQuestion || currentQuestion.type !== "arrange") return;
        setAnswers((prev) => {
            const next = [...prev];
            const current = Array.isArray(next[currentIndex]) ? [...next[currentIndex]] : [];
            if (!current.includes(pieceId)) current.push(pieceId);
            next[currentIndex] = current;
            return next;
        });
    };

    const removeArrangePiece = (pieceId) => {
        if (submitted || !currentQuestion || currentQuestion.type !== "arrange") return;
        setAnswers((prev) => {
            const next = [...prev];
            const current = Array.isArray(next[currentIndex]) ? next[currentIndex] : [];
            next[currentIndex] = current.filter((id) => id !== pieceId);
            return next;
        });
    };

    const clearCurrentAnswer = () => {
        if (submitted || !currentQuestion) return;
        setAnswers((prev) => { const next = [...prev]; next[currentIndex] = currentQuestion.type === "arrange" ? [] : null; return next; });
    };

    const restartTest = () => {
        const nextQuestions = buildQuestionsFromTest(testData);
        setQuestions(nextQuestions);
        setCurrentIndex(0);
        setAnswers(new Array(nextQuestions.length).fill(null));
        setSubmitted(false);
        setResultSaved(false);
    };

    const confirmStopTest = () => {
        localStorage.removeItem(storageKey);
        setStopConfirmOpen(false);
        router.push(`/grammar/${level}`);
    };

    const renderQuestionBody = () => {
        if (!currentQuestion) return null;

        if (currentQuestion.type === "arrange") {
            const selectedPieceIds = Array.isArray(answers[currentIndex]) ? answers[currentIndex] : [];
            const selectedPieces = selectedPieceIds
                .map((pieceId) => currentQuestion.pieces.find((p) => p.id === pieceId))
                .filter(Boolean);
            const arrangeCompleted = currentQuestion.pieces.length > 0 && selectedPieceIds.length === currentQuestion.pieces.length;
            const arrangeAnswerText = arrangeCompleted ? getArrangeAnswerText(currentQuestion, selectedPieceIds) : "";
            const arrangeIsCorrect = arrangeCompleted && isSameArrangeAnswer(arrangeAnswerText, currentQuestion.correctAnswer);

            return (
                <>
                    <div>
                        <p className="text-[11px] font-semibold text-[var(--color-text-soft)] sm:text-sm">Câu {currentIndex + 1}</p>
                        <RubyText
                            text={currentQuestion.question || currentQuestion.prompt || "Sắp xếp đúng ngữ pháp"}
                            className="mt-1 block whitespace-pre-line text-xs font-semibold leading-relaxed text-[var(--color-text)] sm:text-lg"
                            rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[11px]"
                            showFurigana={showFurigana}
                        />
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                        <p className="text-sm font-semibold text-[#9a4f00]">Khung đáp án đã chọn</p>
                        <div className="mt-2 flex min-h-[52px] flex-wrap gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                            {selectedPieces.length === 0 ? (
                                <span className="text-xs text-[#b47a33] sm:text-sm">Chưa chọn</span>
                            ) : (
                                selectedPieces.map((piece) => (
                                    <button
                                        key={piece.id}
                                        type="button"
                                        onClick={() => removeArrangePiece(piece.id)}
                                        className="inline-flex w-fit items-center rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-surface)] sm:text-sm"
                                    >
                                        <RubyText
                                            text={piece.text}
                                            className="leading-none"
                                            rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[10px]"
                                            showFurigana={showFurigana}
                                        />
                                    </button>
                                ))
                            )}
                        </div>
                        {arrangeCompleted ? (
                            <div className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${arrangeIsCorrect ? "border-[#86c99d] bg-[#edf9f1] text-[#166534]" : "border-[#e9a3a3] bg-[#fff0f0] text-[#b42318]"}`}>
                                <div className="flex items-center gap-2">
                                    {arrangeIsCorrect ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                    <span>{arrangeIsCorrect ? "Đúng" : "Sai"}</span>
                                </div>
                                {!arrangeIsCorrect ? (
                                    <p className="mt-1 text-xs font-medium">
                                        Đáp án đúng: <RubyText text={currentQuestion.correctAnswer} showFurigana={showFurigana} className="inline" />
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                        {arrangeCompleted ? (
                            <QuestionExplanation explanation={currentQuestion.explanation} showFurigana={showFurigana} className="mt-3" />
                        ) : null}
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-[var(--color-text-soft)]">Từ / ký tự</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {currentQuestion.pieces.filter((p) => !selectedPieceIds.includes(p.id)).map((piece) => (
                                <button
                                    key={piece.id}
                                    type="button"
                                    onClick={() => addArrangePiece(piece.id)}
                                    className="inline-flex w-fit items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)] sm:text-sm"
                                >
                                    <RubyText
                                        text={piece.text}
                                        className="leading-none"
                                        rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[10px]"
                                        showFurigana={showFurigana}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-2 pt-2">
                        <button type="button" onClick={clearCurrentAnswer} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]">Xóa đáp án</button>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50">Câu trước</button>
                            {currentIndex < questions.length - 1 ? (
                                <button type="button" onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Câu tiếp</button>
                            ) : (
                                <button type="button" onClick={requestSubmit} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Nộp bài</button>
                            )}
                        </div>
                    </div>
                </>
            );
        }

        return (
            <>
                <div>
                    <p className="text-[11px] font-semibold text-[var(--color-text-soft)] sm:text-sm">Câu {currentIndex + 1}</p>
                    <RubyText
                        text={currentQuestion.question || currentQuestion.prompt || currentQuestion.formulaWithBlank}
                        className="mt-1 block whitespace-pre-line text-xs font-semibold leading-relaxed text-[var(--color-text)] sm:text-lg"
                        rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[11px]"
                        showFurigana={showFurigana}
                    />
                </div>

                <div className="grid gap-2">
                    {currentQuestion.options.map((option) => {
                        const selected = normalizeText(answers[currentIndex]) === normalizeText(option);
                        const answered = normalizeText(answers[currentIndex]) !== "";
                        const isCorrectOption = normalizeText(option) === normalizeText(currentQuestion.correctAnswer);
                        const isWrongSelection = answered && selected && !isCorrectOption;
                        const optionClassName = answered && isCorrectOption
                            ? "border-[#86c99d] bg-[#edf9f1] font-semibold text-[#166534]"
                            : isWrongSelection
                                ? "border-[#e9a3a3] bg-[#fff0f0] font-semibold text-[#b42318]"
                                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]";

                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => chooseFillAnswer(option)}
                                disabled={answered}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs transition sm:text-sm ${answered ? "cursor-default" : ""} ${optionClassName}`}
                            >
                                <span>
                                    {showFurigana ? (
                                        <RubyText text={option} className="leading-none" rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-[10px]" showFurigana={showFurigana} />
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

                {normalizeText(answers[currentIndex]) !== "" ? (
                    <QuestionExplanation explanation={currentQuestion.explanation} showFurigana={showFurigana} />
                ) : null}

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                    <button type="button" onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50">Câu trước</button>
                    <div className="flex gap-2">
                        {currentIndex < questions.length - 1 ? (
                            <button type="button" onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Câu tiếp</button>
                        ) : (
                            <button type="button" onClick={requestSubmit} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Nộp bài</button>
                        )}
                    </div>
                </div>
            </>
        );
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
                            onClick={() => setShowFurigana((c) => !c)}
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
                        Dừng kiểm tra
                    </button>
                </div>
            </div>

            {loading ? (
                <LoadingState message="Đang tải bài kiểm tra ngữ pháp..." />
            ) : questions.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Không tìm thấy bài kiểm tra được tạo từ admin cho phần này.
                </p>
            ) : submitted ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Kết quả bài kiểm tra</p>
                    <p className="mt-2 text-3xl font-black text-[var(--color-text)]">{scoreInfo.correct}/{scoreInfo.total}</p>
                    <p className="mt-1 text-base text-[var(--color-text-soft)]">Tỷ lệ đúng: {scoreInfo.percentage}%</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={restartTest} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Làm lại đề</button>
                        <Link href={`/grammar/${level}`} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]">Quay lại</Link>
                    </div>

                    <div className="mt-5 space-y-3">
                        {questions.map((question, index) => {
                            const userAnswer = answers[index];
                            const userAnswerText = question.type === "arrange"
                                ? getArrangeAnswerText(question, Array.isArray(userAnswer) ? userAnswer : [])
                                : normalizeText(userAnswer);
                            const isCorrect = question.type === "arrange"
                                ? isSameArrangeAnswer(userAnswerText, question.correctAnswer)
                                : normalizeText(userAnswerText) === normalizeText(question.correctAnswer);

                            return (
                                <div key={question.id} className={`rounded-2xl border p-4 ${isCorrect ? "border-[#9bd6af] bg-[#f2fbf4]" : "border-[#f1b0b0] bg-[#fff3f3]"}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-[var(--color-text)]">Câu {index + 1}</p>
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isCorrect ? "text-[#166534]" : "text-[#b42318]"}`}>
                                            <CheckCircle2 className="h-4 w-4" />
                                            {isCorrect ? "Đúng" : "Sai"}
                                        </span>
                                    </div>
                                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[var(--color-text)] sm:text-sm">
                                        {stripInlineRubyText(question.question || question.formulaWithBlank || question.prompt || "")}
                                    </p>
                                    <p className="mt-2 text-xs text-[var(--color-text)] sm:text-sm">
                                        <span className="font-semibold">Đáp án của bạn:</span> {userAnswerText || "Chưa trả lời"}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--color-text)] sm:text-sm">
                                        <span className="font-semibold">Đáp án đúng:</span> {question.correctAnswer}
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
                            <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                        </div>
                        <p className="shrink-0 text-sm text-[var(--color-text-soft)]">Đã làm: {answeredCount}/{questions.length}</p>
                    </div>
                    {currentQuestion && renderQuestionBody()}
                </div>
            )}

            {stopConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <p className="inline-flex items-center gap-2 text-base font-bold text-[var(--color-text)]">
                                <AlertTriangle className="h-4 w-4 text-[var(--color-primary)]" />
                                Dừng kiểm tra
                            </p>
                            <button type="button" onClick={() => setStopConfirmOpen(false)} aria-label="Hủy" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-4 py-4">
                            <p className="text-sm text-[var(--color-text-soft)]">Bạn có chắc muốn dừng bài kiểm tra này không?</p>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
                            <button type="button" onClick={() => setStopConfirmOpen(false)} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]">Hủy</button>
                            <button type="button" onClick={confirmStopTest} className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white">Dừng kiểm tra</button>
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
                                Nộp bài
                            </p>
                            <button type="button" onClick={() => setSubmitConfirmOpen(false)} aria-label="Hủy" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-4 py-4">
                            <p className="text-sm text-[var(--color-text-soft)]">Bạn có chắc muốn nộp bài? Sau khi nộp sẽ xem kết quả ngay.</p>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
                            <button type="button" onClick={() => setSubmitConfirmOpen(false)} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]">Hủy</button>
                            <button type="button" onClick={confirmSubmit} className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white">Nộp bài</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

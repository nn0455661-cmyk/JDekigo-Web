"use client";

import { X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import RubyText from "@/components/feature/RubyText";
import { getArrangeAnswerText, isSameArrangeAnswer } from "@/utils/grammarQuestionBuilder";

function normalizeAnswer(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry).trim()).join("|");
    }

    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function isSameAnswer(left, right) {
    return normalizeAnswer(left) === normalizeAnswer(right);
}

function formatAnswer(value) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "--";
    }

    if (value === null || value === undefined || value === "") {
        return "--";
    }

    return String(value);
}

export default function TestHistoryReviewModal({ open, item, title, sourceLabel, onClose }) {
    const { t } = useLanguage();

    if (!open) {
        return null;
    }

    const questions = Array.isArray(item?.questions) ? item.questions : [];
    const answers = Array.isArray(item?.answers) ? item.answers : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-soft)]">
                            {sourceLabel || t("history.sourceLabel", "Lich su")}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">{title || t("history.reviewTitle", "Xem lai bai lam")}</h2>
                        <p className="mt-1 text-sm text-[var(--color-text-soft)]">
                            {item?.correct ?? 0}/{item?.total ?? 0} - {item?.percentage ?? 0}%
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[calc(90vh-92px)] overflow-y-auto p-5">
                    {questions.length === 0 ? (
                        <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                            {t("history.emptyReview", "Khong co du lieu cau hoi de xem lai.")}
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((question, index) => {
                                const selectedAnswer = answers[index];
                                const correctAnswer = question?.correctAnswer ?? question?.answer;
                                const selectedAnswerForCompare = question?.type === "arrange"
                                    ? getArrangeAnswerText(question, Array.isArray(selectedAnswer) ? selectedAnswer : [])
                                    : selectedAnswer;
                                const isCorrect = question?.type === "arrange"
                                    ? isSameArrangeAnswer(selectedAnswerForCompare, correctAnswer)
                                    : isSameAnswer(selectedAnswer, correctAnswer);
                                const hasAnswer = Array.isArray(selectedAnswer)
                                    ? selectedAnswer.length > 0
                                    : selectedAnswer !== null && selectedAnswer !== undefined && String(selectedAnswer).trim() !== "";
                                const options = Array.isArray(question?.options) ? question.options.slice(0, 4) : [];

                                return (
                                    <div
                                        key={question?.id || `${item?.id || "item"}-${index}`}
                                        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4"
                                    >
                                        <p className="text-sm font-semibold text-[var(--color-text)]">
                                            {t("history.questionLabel", "Cau")} {index + 1}
                                        </p>
                                        <div className="mt-1 text-sm text-[var(--color-text-soft)]">
                                            <RubyText
                                                text={question?.prompt || question?.question || question?.title || t("history.defaultQuestion", "Cau hoi")}
                                                className="leading-relaxed"
                                                rtClassName="text-[10px] text-[var(--color-text-soft)]"
                                            />
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                            {options.map((option) => {
                                                const optionText = formatAnswer(option);
                                                const selected = hasAnswer && isSameAnswer(option, selectedAnswer);
                                                const correct = hasAnswer && isSameAnswer(option, correctAnswer);

                                                let optionClassName = "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]";
                                                if (selected && correct) {
                                                    optionClassName = "border-emerald-400 bg-emerald-500/10 text-emerald-800";
                                                } else if (selected && !correct) {
                                                    optionClassName = "border-rose-400 bg-rose-500/10 text-rose-700";
                                                } else if (correct) {
                                                    optionClassName = "border-emerald-400 bg-emerald-500/10 text-emerald-800";
                                                }

                                                return (
                                                    <div
                                                        key={`${question?.id || index}-${optionText}`}
                                                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${optionClassName}`}
                                                    >
                                                        {optionText}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 ${!hasAnswer
                                                    ? "bg-slate-500/15 text-slate-600"
                                                    : isCorrect
                                                        ? "bg-emerald-500/15 text-emerald-700"
                                                        : "bg-rose-500/15 text-rose-700"
                                                    }`}
                                            >
                                                {!hasAnswer ? t("history.unselected", "Chua chon") : isCorrect ? t("history.correct", "Dung") : t("history.incorrect", "Sai")}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

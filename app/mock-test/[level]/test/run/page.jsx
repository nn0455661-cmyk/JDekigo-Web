"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { getPublishedQuestions } from "@/src/services/test.service";
import notify from "@/src/lib/notifier";
import MockTestExamRunner from "@/components/feature/MockTestExamRunner";
import LoadingState from "@/components/LoadingState";

const MIN_MOCK_TEST_QUESTIONS = 30;

function getDistributionKey(distribution) {
    return Object.entries(distribution)
        .map(([key, value]) => `${key}-${value}`)
        .join("-");
}

function normalizeQuestionAnswer(item) {
    const opts = Array.isArray(item.options) ? item.options : [];
    const rawCorrect = item.correctAnswer || item.answer || "";

    if (typeof rawCorrect === "string" && /^[A-Z]$/.test(rawCorrect)) {
        const idx = rawCorrect.charCodeAt(0) - 65;
        return opts[idx] ?? rawCorrect;
    }

    if (typeof rawCorrect === "number") {
        return opts[rawCorrect] ?? rawCorrect;
    }

    return rawCorrect;
}

export default function MockTestRunPage(props) {
    const params = use(props.params);
    const { level } = params;
    const search = useSearchParams();
    const count = Number(search.get("count") || 30);
    const timeLimit = Number(search.get("time") || 30);
    const attemptId = search.get("attempt");
    const distribution = useMemo(
        () => ({
            vocabulary: Number(search.get("vocabulary") || 0),
            kanji: Number(search.get("kanji") || 0),
            grammar: Number(search.get("grammar") || 0),
            reading: Number(search.get("reading") || 0),
        }),
        [search]
    );
    const testId = useMemo(() => {
        if (attemptId) {
            return `mock-${String(level).toLowerCase()}-${attemptId}`;
        }

        return `mock-${String(level).toLowerCase()}-${count}-${timeLimit}-${getDistributionKey(distribution)}`;
    }, [attemptId, count, distribution, level, timeLimit]);
    const selectedQuestionsKey = useMemo(
        () => `mock-test-run:${String(level).toUpperCase()}:${testId}:questions`,
        [level, testId]
    );

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                setLoading(true);

                const savedRaw = localStorage.getItem(selectedQuestionsKey);
                if (savedRaw) {
                    const savedQuestions = JSON.parse(savedRaw);
                    if (Array.isArray(savedQuestions) && savedQuestions.length > 0) {
                        if (active) {
                            setQuestions(savedQuestions);
                            setLoading(false);
                        }
                        return;
                    }
                }

                const requestedCategories = Object.entries(distribution).filter(([, requested]) => requested > 0);
                const responses = await Promise.all(
                    requestedCategories.map(([category, requested]) =>
                        getPublishedQuestions({
                            level: String(level).toUpperCase(),
                            module: "mock_test",
                            category,
                            limit: requested,
                            random: true,
                        })
                    )
                );
                const preferredItems = responses.flatMap((response) => response.items || []);
                const selectedIds = new Set(preferredItems.map((item) => String(item.id || item._id || "")));
                const shortage = Math.max(0, count - preferredItems.length);
                let fallbackItems = [];

                if (shortage > 0) {
                    const fallbackResponse = await getPublishedQuestions({
                        level: String(level).toUpperCase(),
                        module: "mock_test",
                        limit: Math.max(count * 3, count + preferredItems.length),
                        random: true,
                    });
                    fallbackItems = (fallbackResponse.items || [])
                        .filter((item) => !selectedIds.has(String(item.id || item._id || "")))
                        .slice(0, shortage);
                }

                const rawItems = [...preferredItems, ...fallbackItems].slice(0, count);
                const normalized = rawItems.flatMap((item) => {
                    if (item.type !== "reading_comprehension") {
                        return [item];
                    }

                    const passage = item.passage || "";
                    const subQuestions = Array.isArray(item.subQuestions) ? item.subQuestions : [];
                    if (!subQuestions.length) {
                        return [
                            {
                                id: item.id,
                                question: [passage, item.question || item.prompt || ""].filter(Boolean).join("\n\n"),
                                options: Array.isArray(item.options) ? item.options : [],
                                correctAnswer: item.correctAnswer || item.answer || "",
                                explanation: item.explanation || "",
                                passage,
                                type: "reading_comprehension",
                            },
                        ];
                    }

                    const subQuestionIndex = Math.floor(Math.random() * subQuestions.length);
                    const sub = subQuestions[subQuestionIndex];
                    return [
                        {
                            id: `${item.id}-${subQuestionIndex + 1}`,
                            question: [passage, sub.question || ""].filter(Boolean).join("\n\n"),
                            options: Array.isArray(sub.options) ? sub.options : [],
                            correctAnswer: sub.correctAnswer || "",
                            explanation: sub.explanation || item.explanation || "",
                            passage,
                            type: "reading_comprehension",
                        },
                    ];
                });

                let selected = normalized;

                if (normalized.length < MIN_MOCK_TEST_QUESTIONS) {
                    selected = [];
                    notify.warn(`Ngân hàng đề ${String(level).toUpperCase()} cần tối thiểu ${MIN_MOCK_TEST_QUESTIONS} câu để mở kiểm tra.`);
                } else if (selected.length < count) {
                    selected = [];
                    notify.warn(`Ngân hàng đề ${String(level).toUpperCase()} hiện có ${normalized.length} câu, chưa đủ ${count} câu theo yêu cầu.`);
                }

                if (selected.length > 0) {
                    localStorage.setItem(selectedQuestionsKey, JSON.stringify(selected));
                }

                if (active) {
                    setQuestions(selected);
                    setLoading(false);
                }
            } catch (error) {
                notify.error(error, "Không tải được đề");
                if (active) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [count, distribution, level, selectedQuestionsKey]);

    if (loading) {
        return (
            <section className="dashboard-shell p-4">
                <LoadingState message="Đang tải đề kiểm tra..." />
            </section>
        );
    }

    if (!questions.length) {
        return <div className="p-4">Không có câu hỏi cho level này.</div>;
    }

    const mappedQuestions = questions.map((item) => ({
        id: item.id,
        prompt: item.question || item.prompt || item.title || "",
        options: Array.isArray(item.options) ? item.options : [],
        answer: normalizeQuestionAnswer(item),
        reading: item.reading || item.passage || undefined,
        explanation: item.explanation || "",
    }));

    return (
        <section className="p-1 sm:p-4">
            <MockTestExamRunner
                level={String(level).toUpperCase()}
                testId={testId}
                title={`Đề Thi - ${String(level).toUpperCase()}`}
                minutes={timeLimit}
                questions={mappedQuestions}
            />
        </section>
    );
}

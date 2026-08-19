"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import MockTestExamRunner from "@/components/feature/MockTestExamRunner";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import { getTestById } from "@/src/services/test.service";
import { useLanguage } from "@/hooks/useLanguage";

function normalizeQuestionAnswer(questionItem) {
    const options = Array.isArray(questionItem.options) ? questionItem.options : [];
    const rawCorrect = questionItem.correctAnswer || questionItem.answer || "";

    if (typeof rawCorrect === "string" && /^[A-Z]$/.test(rawCorrect)) {
        const index = rawCorrect.charCodeAt(0) - 65;
        return options[index] ?? rawCorrect;
    }

    if (typeof rawCorrect === "number") {
        return options[rawCorrect] ?? rawCorrect;
    }

    return rawCorrect;
}

export default function MockTestRunPage() {
    const params = useParams();
    const { t } = useLanguage();
    const [testData, setTestData] = useState(null);
    const [loading, setLoading] = useState(true);

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const testId = String(params?.testId || "mock-full-30");

    useEffect(() => {
        let active = true;

        const loadTest = async () => {
            setLoading(true);

            try {
                const data = await getTestById(testId, { level: rawLevel });
                if (active) {
                    setTestData(data?.data?.item || null);
                }
            } catch {
                if (active) {
                    setTestData(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadTest();

        return () => {
            active = false;
        };
    }, [rawLevel, testId]);

    const runnerQuestions = useMemo(
        () =>
            (testData?.questions || []).map((questionItem, index) => {
                let prompt = questionItem.question || questionItem.prompt || questionItem.title || "";
                if (questionItem.type === "reading_comprehension" && questionItem.passage) {
                    prompt = `【Bài đọc】\n${questionItem.passage}\n\n【Câu hỏi】\n${prompt}`;
                }

                return {
                    id: questionItem.id || `question-${index + 1}`,
                    prompt,
                    reading: questionItem.reading || "",
                    options: questionItem.options || [],
                    answer: normalizeQuestionAnswer(questionItem),
                    explanation: questionItem.explanation || "",
                };
            }),
        [testData]
    );

    const localizedTitle = useMemo(() => {
        if (testData?.testTitle) {
            return testData.testTitle;
        }

        return `${t("mockTest.fullTestTitle", "Kiểm tra tổng hợp")} ${level}`;
    }, [level, t, testData]);

    const minutes = testData?.timeLimit || 30;
    const mockTestType = testData?.miniTestGroupId ? "mini" : "full";

    if (loading) {
        return (
            <section className="dashboard-shell p-4 sm:p-5">
                <LoadingState message="Đang tải đề kiểm tra..." />
            </section>
        );
    }

    return (
        <MockTestExamRunner
            level={level}
            testId={testData?.id || testId}
            title={localizedTitle}
            minutes={minutes}
            questions={runnerQuestions}
            testKind={testData?.testKind || "module_exam"}
            miniTestGroupId={testData?.miniTestGroupId || ""}
            mockTestType={mockTestType}
        />
    );
}

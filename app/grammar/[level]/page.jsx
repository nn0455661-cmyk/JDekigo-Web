"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookText, ChevronRight, ClipboardCheck, History } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState, { InlineLoading } from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import ActionListModal from "@/components/feature/ActionListModal";
import * as grammarService from "src/services/grammar.service";
import { getCachedTests, getTests } from "@/src/services/test.service";

const GRAMMAR_PER_LESSON = 5;

function clearGrammarStorage(level) {
    const prefixes = [
        `grammar-test-history:${level}`,
        `grammar-practice-history:${level}`,
        `grammar-demo-test:${level}`,
        `grammar-practice:${level}:`,
    ];

    try {
        const keysToRemove = [];

        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (!key) continue;

            if (prefixes.some((prefix) => key === prefix || key.startsWith(prefix))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
        // Ignore storage failures so the page still loads.
    }
}

function buildLessons(items = []) {
    const hasLessonOrder = items.some((item) => Number(item.lessonOrder));

    if (!hasLessonOrder) {
        const sorted = [...items].sort((a, b) => Number(a.id) - Number(b.id));
        const lessons = [];

        for (let i = 0; i < sorted.length; i += GRAMMAR_PER_LESSON) {
            const chunk = sorted.slice(i, i + GRAMMAR_PER_LESSON);
            const lessonNumber = Math.floor(i / GRAMMAR_PER_LESSON) + 1;

            lessons.push({
                lessonId: lessonNumber,
                title: `Lesson ${lessonNumber}`,
                grammarItems: chunk,
            });
        }

        return lessons;
    }

    const lessonMap = new Map();
    items.forEach((item) => {
        const lessonOrder = Number(item.lessonOrder);
        if (!lessonOrder) {
            return;
        }

        if (!lessonMap.has(lessonOrder)) {
            lessonMap.set(lessonOrder, {
                lessonId: lessonOrder,
                title: item.lessonTitle || `BÃ i ${lessonOrder}`,
                grammarItems: [],
            });
        }

        lessonMap.get(lessonOrder).grammarItems.push(item);
    });

    return Array.from(lessonMap.values())
        .sort((a, b) => a.lessonId - b.lessonId)
        .map((lesson) => ({
            ...lesson,
            grammarItems: [...lesson.grammarItems].sort(
                (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            ),
        }));
}

export default function GrammarLevelPage() {
    const router = useRouter();
    const params = useParams();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const { t } = useLanguage();

    const [items, setItems] = useState(() => {
        const cached = grammarService.getCachedGrammar();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [tests, setTests] = useState(() => getCachedTests({ level, module: "grammar", status: "published" })?.data?.items || []);
    const [loading, setLoading] = useState(() => !grammarService.getCachedGrammar());
    const [testsLoading, setTestsLoading] = useState(() => !getCachedTests({ level, module: "grammar", status: "published" }));
    const [testOpen, setTestOpen] = useState(false);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/grammar/${level}`);
            return;
        }

        const historyResetKey = `grammar-history-reset:${level}:v2`;

        try {
            if (!localStorage.getItem(historyResetKey)) {
                clearGrammarStorage(level);
                localStorage.setItem(historyResetKey, "1");
            }
        } catch {
            // Ignore storage failures so the page still loads.
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
    }, [rawLevel, level, router]);

    useEffect(() => {
        let mounted = true;

        const fetchTests = async () => {
            if (!getCachedTests({ level, module: "grammar", status: "published" })) {
                setTestsLoading(true);
            }

            try {
                const payload = await getTests({ level, module: "grammar", status: "published" });
                if (mounted) {
                    setTests(payload?.data?.items || []);
                }
            } catch {
                if (mounted) {
                    setTests([]);
                }
            } finally {
                if (mounted) {
                    setTestsLoading(false);
                }
            }
        };

        fetchTests();

        return () => {
            mounted = false;
        };
    }, [level]);

    const filteredItems = useMemo(
        () => items.filter((item) => item.level === level),
        [items, level]
    );

    const lessons = useMemo(() => buildLessons(filteredItems), [filteredItems]);

    const visibleLessons = useMemo(
        () => lessons.map((lesson) => ({ ...lesson, matchedItems: lesson.grammarItems })),
        [lessons]
    );

    const totalGrammar = filteredItems.length;
    const totalMatchedGrammar = useMemo(
        () => visibleLessons.reduce((acc, lesson) => acc + lesson.matchedItems.length, 0),
        [visibleLessons]
    );

    const statsText = useMemo(
        () => `${lessons.length} ${t("grammar.lessonUnit", "bÃ i")} - ${totalGrammar} ${t("grammar.title")}`,
        [lessons.length, totalGrammar, t]
    );

    const testOptions = useMemo(
        () =>
            [...tests]
                .sort((a, b) => (a.testTitle || "").localeCompare(b.testTitle || "", undefined, { numeric: true }))
                .map((test) => ({
                    id: test.id,
                    title: test.testTitle,
                    href: `/grammar/${level}/test/${test.id}`,
                    meta: `${test.totalQuestions || 0} câu | ${test.timeLimit || 0} phút`,
                })),
        [level, tests]
    );
    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-grammar-bg)] text-[var(--icon-grammar)]">
                        <BookText className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("grammar.title")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">{statsText}</p>
                    </div>
                </div>

                <div className="flex w-full items-center gap-2 md:w-auto md:justify-end">
                    <Link
                        href={`/grammar/${level}/history`}
                        className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] transition hover:opacity-90"
                        aria-label={t("grammar.historyButton", "Lá»‹ch sá»­ lÃ m bÃ i")}
                        title={t("grammar.historyButton", "Lá»‹ch sá»­ lÃ m bÃ i")}
                    >
                        <History className="h-4 w-4" />
                    </Link>

                    <button
                        type="button"
                        onClick={() => setTestOpen(true)}
                        className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl border border-[#f1a1a1] bg-[#ffecec] px-3 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#ffdede]"
                    >
                        <ClipboardCheck className="h-4 w-4" />
                        {testsLoading ? <InlineLoading message="Đang tải..." className="text-[#b42318]" /> : t("grammar.testButton", "Kiá»ƒm tra")}
                    </button>

                    <Link
                        href="/grammar"
                        className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-grammar-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-grammar)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
            </div>

            {loading ? (
                <LoadingState message={t("grammar.loading")} />
            ) : filteredItems.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("grammar.noLevelData", "ChÆ°a cÃ³ bÃ i há»c cho cáº¥p Ä‘á»™")} {level}.
                </p>
            ) : (
                <div className="space-y-3">
                    {visibleLessons.map((lesson) => (
                        <Link
                            key={lesson.lessonId}
                            href={`/grammar/${level}/${lesson.lessonId}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--color-text)] sm:text-sm">
                                    {lesson.title} - {t("grammar.grammarListLabel", "Danh sÃ¡ch ngá»¯ phÃ¡p")}
                                </p>
                                <p className="mt-1 text-[11px] text-[var(--color-text-soft)] sm:text-xs">
                                    {lesson.matchedItems.length} {t("grammar.title")}
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-soft)]" />
                        </Link>
                    ))}
                </div>
            )}

            <ActionListModal
                open={testOpen}
                title={t("grammar.testSetupTitle", "Äá» kiá»ƒm tra ngá»¯ phÃ¡p")}
                subtitle={level}
                onClose={() => setTestOpen(false)}
                items={testOptions}
                cancelLabel={t("grammar.cancel", "Há»§y")}
                emptyText="Chưa có bài kiểm tra được tạo từ admin cho phần này."
            />
        </section>
    );
}



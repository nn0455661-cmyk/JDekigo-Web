"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckSquare, ChevronRight, ClipboardCheck, Dumbbell, FileText, History, Languages, Square, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as kanjiService from "src/services/kanji.service";
import { getCachedTests, getTests } from "@/src/services/test.service";
import { buildKanjiLessons as buildAdminKanjiLessons } from "@/src/shared/utils/kanjiLessons";

export default function KanjiLevelPage() {
    const params = useParams();
    const router = useRouter();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const { t } = useLanguage();

    const [items, setItems] = useState([]);
    const [lessonItems, setLessonItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tests, setTests] = useState([]);
    const [testsLoading, setTestsLoading] = useState(true);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [testOpen, setTestOpen] = useState(false);
    const [selectedLessonKeys, setSelectedLessonKeys] = useState([]);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/kanji/${level}`);
            return;
        }

        const cachedKanji = kanjiService.getCachedKanji();
        if (cachedKanji) {
            setItems(Array.isArray(cachedKanji?.data?.data) ? cachedKanji.data.data : []);
            setLessonItems(Array.isArray(cachedKanji?.data?.lessons) ? cachedKanji.data.lessons : []);
            setLoading(false);
        }

        const fetchKanji = async () => {
            try {
                const result = await kanjiService.getKanji();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
                setLessonItems(Array.isArray(result?.data?.lessons) ? result.data.lessons : []);
            } finally {
                setLoading(false);
            }
        };

        fetchKanji();
    }, [rawLevel, level, router]);

    useEffect(() => {
        let isMounted = true;

        const fetchTests = async () => {
            const cachedTests = getCachedTests({ level: rawLevel, module: "kanji", status: "published" });
            if (cachedTests) {
                setTests(cachedTests?.data?.items || []);
                setTestsLoading(false);
            } else {
                setTestsLoading(true);
            }

            try {
                const payload = await getTests({ level: rawLevel, module: "kanji", status: "published" });
                if (isMounted) {
                    setTests(payload?.data?.items || []);
                }
            } catch {
                if (isMounted) {
                    setTests([]);
                }
            } finally {
                if (isMounted) {
                    setTestsLoading(false);
                }
            }
        };

        fetchTests();

        return () => {
            isMounted = false;
        };
    }, [rawLevel]);

    const filteredItems = useMemo(
        () => items.filter((item) => item.level === level),
        [items, level]
    );

    const filteredLessonItems = useMemo(
        () => lessonItems.filter((lesson) => lesson.level === level),
        [lessonItems, level]
    );

    const lessons = useMemo(
        () => buildAdminKanjiLessons(filteredItems, filteredLessonItems),
        [filteredItems, filteredLessonItems]
    );

    const allLessonKeys = useMemo(() => lessons.map((lesson) => lesson.key), [lessons]);

    const selectedCardsCount = useMemo(() => {
        const selected = new Set(selectedLessonKeys);
        return lessons.reduce((total, lesson) => {
            if (!selected.has(lesson.key)) {
                return total;
            }
            return total + lesson.items.length;
        }, 0);
    }, [lessons, selectedLessonKeys]);

    const isAllSelected = allLessonKeys.length > 0 && selectedLessonKeys.length === allLessonKeys.length;

    const startFlashcardHref = useMemo(() => {
        const query = new URLSearchParams();
        if (selectedLessonKeys.length) {
            query.set("lessons", selectedLessonKeys.join(","));
        }
        return `/kanji/${level}/flashcard?${query.toString()}`;
    }, [level, selectedLessonKeys]);

    const kanjiTests = useMemo(
        () =>
            [...(tests || [])]
                .sort((a, b) => (a.testTitle || "").localeCompare(b.testTitle || "", undefined, { numeric: true }))
                .map((testItem) => ({
                    id: testItem.id,
                    title: testItem.testTitle,
                    questionCount: testItem.totalQuestions || 0,
                    minutes: testItem.timeLimit || 0,
                })),
        [tests]
    );

    const closeReviewModal = () => {
        setReviewOpen(false);
    };

    const toggleLesson = (lessonKey) => {
        setSelectedLessonKeys((prev) => {
            if (prev.includes(lessonKey)) {
                return prev.filter((item) => item !== lessonKey);
            }
            return [...prev, lessonKey];
        });
    };

    const toggleAllLessons = () => {
        setSelectedLessonKeys((prev) => (prev.length === allLessonKeys.length ? [] : allLessonKeys));
    };

    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-kanji-bg)] text-[var(--icon-kanji)]">
                        <Languages className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("kanji.title")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">
                            {lessons.length} {t("vocabulary.lessons", "bài")} - {filteredItems.length} ký tự
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={`/kanji/${level}/history`}
                        className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] transition hover:opacity-90"
                        aria-label={t("vocabulary.testHistoryTitle", "Lịch sử làm bài")}
                        title={t("vocabulary.testHistoryTitle", "Lịch sử làm bài")}
                    >
                        <History className="h-4 w-4" />
                    </Link>

                    <Link
                        href="#"
                        onClick={(event) => {
                            event.preventDefault();
                            setSelectedLessonKeys(allLessonKeys);
                            setReviewOpen(true);
                        }}
                        className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl border border-[#86d5a8] bg-[#eafaf0] px-3 py-2 text-sm font-semibold text-[#166534] transition hover:bg-[#d9f4e3]"
                    >
                        <Dumbbell className="h-4 w-4" />
                        Ôn tập
                    </Link>

                    <Link
                        href="#"
                        onClick={(event) => {
                            event.preventDefault();
                            setTestOpen(true);
                        }}
                        className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl border border-[#f1a1a1] bg-[#ffecec] px-3 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#ffdede]"
                    >
                        <ClipboardCheck className="h-4 w-4" />
                        Kiểm tra
                    </Link>

                    <Link
                        href="/kanji"
                        className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-kanji-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-kanji)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
            </div>

            {loading ? (
                <LoadingState message={t("kanji.loading")} />
            ) : filteredItems.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Chưa có dữ liệu kanji cho cấp độ {level}.
                </p>
            ) : (
                <div className="grid gap-3">
                    {lessons.map((lesson) => (
                        <Link
                            key={lesson.key}
                            href={`/kanji/${level}/flashcard?lessons=${encodeURIComponent(lesson.key)}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--color-text)] sm:text-sm">{lesson.lessonTitle}</p>
                                <p className="mt-1 text-[11px] text-[var(--color-text-soft)] sm:text-xs">
                                    {lesson.items.length} ký tự
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-soft)]" />
                        </Link>
                    ))}
                </div>
            )}

            {testOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <div>
                                <p className="text-lg font-bold text-[var(--color-text)]">Đề kiểm tra Kanji</p>
                                <p className="text-sm text-[var(--color-text-soft)]">{level}</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Đóng"
                                onClick={() => setTestOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
                            {testsLoading ? (
                                <LoadingState message="Đang tải danh sách bài kiểm tra..." rows={2} compact />
                            ) : kanjiTests.length === 0 ? (
                                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-soft)]">
                                    Chưa có bài kiểm tra Kanji cho level này.
                                </p>
                            ) : (
                                kanjiTests.map((test) => (
                                    <Link
                                        key={test.id}
                                        href={`/kanji/${level}/test/${test.id}`}
                                        onClick={() => setTestOpen(false)}
                                        className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:bg-[var(--color-bg-soft)]"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                                                <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                                <span className="truncate">{test.title}</span>
                                            </p>
                                            <span className="shrink-0 text-xs font-semibold text-[var(--color-text-soft)]">
                                                {test.questionCount || 0} câu | {test.minutes || 0} phút
                                            </span>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {reviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <div>
                                <p className="text-lg font-bold text-[var(--color-text)]">Chuẩn bị ôn tập flashcard</p>
                                <p className="text-sm text-[var(--color-text-soft)]">{level}</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Đóng"
                                onClick={closeReviewModal}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-4">
                            <button
                                type="button"
                                onClick={toggleAllLessons}
                                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-text)]"
                            >
                                {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                Chọn tất cả bài
                            </button>

                            <p className="text-sm text-[var(--color-text-soft)]">
                                Đã chọn: {selectedLessonKeys.length}/{allLessonKeys.length} bài - {selectedCardsCount} thẻ
                            </p>

                            <div className="mt-3 space-y-2">
                                {lessons.map((lesson) => {
                                    const checked = selectedLessonKeys.includes(lesson.key);
                                    return (
                                        <button
                                            key={lesson.key}
                                            type="button"
                                            onClick={() => toggleLesson(lesson.key)}
                                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2 text-left transition hover:bg-[var(--color-bg-soft)]"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                {checked ? (
                                                    <CheckSquare className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                                ) : (
                                                    <Square className="h-4 w-4 shrink-0 text-[var(--color-text-soft)]" />
                                                )}
                                                <span className="truncate text-sm font-semibold text-[var(--color-text)]">{lesson.lessonTitle}</span>
                                            </div>
                                            <span className="shrink-0 text-xs text-[var(--color-text-soft)]">{lesson.items.length} ký tự</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
                            <button
                                type="button"
                                onClick={closeReviewModal}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]"
                            >
                                Hủy
                            </button>

                            {selectedLessonKeys.length === 0 ? (
                                <button
                                    type="button"
                                    disabled
                                    className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white opacity-60"
                                >
                                    Bắt đầu flashcard
                                </button>
                            ) : (
                                <Link
                                    href={startFlashcardHref}
                                    onClick={closeReviewModal}
                                    className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                                >
                                    Bắt đầu flashcard
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckSquare, ChevronRight, ClipboardCheck, Dumbbell, FileText, History, Square, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState, { InlineLoading } from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as vocabularyService from "src/services/vocabulary.service";
import { getCachedTests, getTests } from "@/src/services/test.service";

function makeLessonKey(topicId, lessonId) {
    return `${topicId || "other"}::${lessonId || "common"}`;
}

export default function VocabularyLevelPage() {
    const router = useRouter();
    const params = useParams();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const { t } = useLanguage();

    const [items, setItems] = useState(() => {
        const cached = vocabularyService.getCachedVocabulary();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [tests, setTests] = useState(() => getCachedTests({ level, module: "vocabulary", status: "published" })?.data?.items || []);
    const [loading, setLoading] = useState(() => !vocabularyService.getCachedVocabulary());
    const [testsLoading, setTestsLoading] = useState(() => !getCachedTests({ level, module: "vocabulary", status: "published" }));
    const [reviewOpen, setReviewOpen] = useState(false);
    const [testOpen, setTestOpen] = useState(false);
    const [selectedLessonKeys, setSelectedLessonKeys] = useState([]);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/vocabulary/${level}`);
            return;
        }

        const fetchVocabulary = async () => {
            try {
                const result = await vocabularyService.getVocabulary();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchVocabulary();
    }, [rawLevel, level, router]);

    useEffect(() => {
        let mounted = true;

        const fetchTests = async () => {
            if (!getCachedTests({ level, module: "vocabulary", status: "published" })) {
                setTestsLoading(true);
            }

            try {
                const payload = await getTests({ level, module: "vocabulary", status: "published" });
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

    const lessons = useMemo(() => {
        const lessonMap = filteredItems.reduce((acc, item) => {
            const topicId = item.topicId || "other";
            const lessonId = item.lessonId || "common";
            const key = `${topicId}::${lessonId}`;

            if (!acc[key]) {
                acc[key] = {
                    key,
                    topicId,
                    lessonId,
                    topicJa: item.topicJa || "その他",
                    topicVi: item.topicVi || t("vocabulary.otherTopic", "Khác"),
                    lessonTitle: item.lessonTitle || t("vocabulary.defaultLesson", "Bài tổng hợp"),
                    lessonOrder: item.lessonOrder || 999,
                    words: [],
                };
            }

            acc[key].words.push(item);
            return acc;
        }, {});

        return Object.values(lessonMap).sort((a, b) => {
            if (a.lessonOrder !== b.lessonOrder) {
                return a.lessonOrder - b.lessonOrder;
            }
            return a.lessonTitle.localeCompare(b.lessonTitle);
        });
    }, [filteredItems, t]);

    const allLessonKeys = useMemo(
        () => lessons.map((lesson) => makeLessonKey(lesson.topicId, lesson.lessonId)),
        [lessons]
    );

    const selectedWordsCount = useMemo(() => {
        const keySet = new Set(selectedLessonKeys);
        return lessons.reduce((acc, lesson) => {
            const key = makeLessonKey(lesson.topicId, lesson.lessonId);
            if (!keySet.has(key)) {
                return acc;
            }
            return acc + lesson.words.length;
        }, 0);
    }, [lessons, selectedLessonKeys]);

    const isAllSelected = allLessonKeys.length > 0 && selectedLessonKeys.length === allLessonKeys.length;

    const startFlashcardHref = useMemo(() => {
        const query = new URLSearchParams();
        if (selectedLessonKeys.length) {
            query.set("lessons", selectedLessonKeys.join(","));
        }
        return `/vocabulary/${level}/flashcard?${query.toString()}`;
    }, [level, selectedLessonKeys]);

    const openReviewModal = () => {
        setSelectedLessonKeys(allLessonKeys);
        setReviewOpen(true);
    };

    const closeReviewModal = () => {
        setReviewOpen(false);
    };

    const toggleLesson = (topicId, lessonId) => {
        const key = makeLessonKey(topicId, lessonId);
        setSelectedLessonKeys((prev) => {
            if (prev.includes(key)) {
                return prev.filter((item) => item !== key);
            }
            return [...prev, key];
        });
    };

    const toggleAllLessons = () => {
        setSelectedLessonKeys((prev) => (prev.length === allLessonKeys.length ? [] : allLessonKeys));
    };

    const testOptions = useMemo(
        () =>
            [...tests]
                .sort((a, b) => (a.testTitle || "").localeCompare(b.testTitle || "", undefined, { numeric: true }))
                .map((test) => ({
                    id: test.id,
                    title: test.testTitle,
                    href: `/vocabulary/${level}/test/${test.id}`,
                    meta: `${test.totalQuestions || 0} câu | ${test.timeLimit || 0} phút`,
                })),
        [level, tests]
    );
    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-vocabulary-bg)] text-[var(--icon-vocabulary)]">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("vocabulary.title")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">
                            {lessons.length + 1} {t("vocabulary.lessons", "bài")} - {filteredItems.length} {t("vocabulary.words", "từ")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={`/vocabulary/${level}/history`}
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
                            openReviewModal();
                        }}
                        className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl border border-[#86d5a8] bg-[#eafaf0] px-3 py-2 text-sm font-semibold text-[#166534] transition hover:bg-[#d9f4e3]"
                    >
                        <Dumbbell className="h-4 w-4" />
                        {t("vocabulary.reviewButton", "Ôn tập")}
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
                        {testsLoading ? <InlineLoading message="Đang tải..." className="text-[#b42318]" /> : t("vocabulary.testButton", "Kiểm tra")}
                    </Link>

                    <Link
                        href="/vocabulary"
                        className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-vocabulary-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-vocabulary)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
            </div>

            {loading ? (
                <LoadingState message={t("vocabulary.loading")} />
            ) : filteredItems.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("vocabulary.noLevelData", "Chưa có từ vựng cho cấp độ")} {level}.
                </p>
            ) : (
                <div className="grid gap-3">
                    <Link
                        href={`/vocabulary/${level}/intro`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#f5c28b] bg-gradient-to-r from-[#fff4e8] to-[#ffe9d1] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
                    >
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-[#9a3412] sm:text-xl">Bài Nhập môn</p>
                            <p className="mt-1 text-sm text-[#b45309]">
                                Hiragana, Katakana và các cách đếm cơ bản
                            </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-[#b45309]" />
                    </Link>

                    {lessons.map((lesson) => (
                        <Link
                            key={lesson.key}
                            href={`/vocabulary/${level}/flashcard?lessons=${encodeURIComponent(lesson.key)}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--color-text)] sm:text-sm">{lesson.lessonTitle}</p>
                                <p className="mt-1 text-[11px] text-[var(--color-text-soft)] sm:text-xs">
                                    {lesson.words.length} {t("vocabulary.words", "từ")}
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
                                <p className="text-lg font-bold text-[var(--color-text)]">{t("vocabulary.testSetupTitle", "Đề kiểm tra từ vựng")}</p>
                                <p className="text-sm text-[var(--color-text-soft)]">{level}</p>
                            </div>
                            <button
                                type="button"
                                aria-label={t("vocabulary.closeTestModal", "Đóng")}
                                onClick={() => setTestOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
                            {testOptions.length === 0 ? (
                                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-soft)]">
                                    Chưa có bài kiểm tra được tạo từ admin cho phần này.
                                </p>
                            ) : testOptions.map((test) => (
                                <Link
                                    key={test.id}
                                    href={test.href}
                                    onClick={() => setTestOpen(false)}
                                    className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:bg-[var(--color-bg-soft)]"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                                            <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                            <span className="truncate">{test.title}</span>
                                        </p>
                                        <span className="shrink-0 text-xs font-semibold text-[var(--color-text-soft)]">{test.meta}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        <div className="flex justify-end border-t border-[var(--color-border)] px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setTestOpen(false)}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]"
                            >
                                {t("vocabulary.cancel", "Hủy")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                            <div>
                                <p className="text-lg font-bold text-[var(--color-text)]">{t("vocabulary.reviewSetupTitle", "Chuẩn bị ôn tập flashcard")}</p>
                                <p className="text-sm text-[var(--color-text-soft)]">{level}</p>
                            </div>
                            <button
                                type="button"
                                aria-label={t("vocabulary.closeReviewModal", "Đóng")}
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
                                {t("vocabulary.selectAllLessons", "Chọn tất cả bài")}
                            </button>

                            <p className="mt-2 text-sm text-[var(--color-text-soft)]">
                                {t("vocabulary.selectedSummary", "Đã chọn")}: {selectedLessonKeys.length}/{allLessonKeys.length} {t("vocabulary.lessons", "bài")} - {selectedWordsCount} {t("vocabulary.words", "từ")}
                            </p>

                            <div className="mt-3 space-y-2">
                                {lessons.map((lesson) => {
                                    const key = makeLessonKey(lesson.topicId, lesson.lessonId);
                                    const checked = selectedLessonKeys.includes(key);

                                    return (
                                        <button
                                            key={lesson.key}
                                            type="button"
                                            onClick={() => toggleLesson(lesson.topicId, lesson.lessonId)}
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
                                            <span className="shrink-0 text-xs text-[var(--color-text-soft)]">
                                                {lesson.words.length} {t("vocabulary.words", "từ")}
                                            </span>
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
                                {t("vocabulary.cancel", "Hủy")}
                            </button>

                            {selectedLessonKeys.length === 0 ? (
                                <button
                                    type="button"
                                    disabled
                                    className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white opacity-60"
                                >
                                    {t("vocabulary.startFlashcard", "Bắt đầu flashcard")}
                                </button>
                            ) : (
                                <Link
                                    href={startFlashcardHref}
                                    onClick={closeReviewModal}
                                    className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                                >
                                    {t("vocabulary.startFlashcard", "Bắt đầu flashcard")}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}


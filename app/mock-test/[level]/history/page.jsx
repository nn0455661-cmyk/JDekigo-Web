"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Eye } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import { useAuth } from "@/src/shared/hooks/useAuth";
import { fetchTestHistory, loadLocalTestHistory } from "@/src/services/history.service";
import TestHistoryReviewModal from "@/components/feature/TestHistoryReviewModal";

function formatDateTime(value, locale) {
    if (!value) {
        return "--";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "--";
    }

    return date.toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function mapLanguageToLocale(language) {
    if (language === "ja") {
        return "ja-JP";
    }

    if (language === "en") {
        return "en-US";
    }

    return "vi-VN";
}

function formatDuration(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const remain = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function cleanTestTitle(value, level, fallbackTitle) {
    const title = String(value || "").trim();
    if (!title) {
        return fallbackTitle;
    }

    return title.replace(new RegExp(`\s*${level}$`), "").trim();
}

export default function MockTestHistoryPage() {
    const { isReady, user } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();
    const params = useParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const locale = mapLanguageToLocale(language);

    const [historyItems, setHistoryItems] = useState([]);
    const [reviewItem, setReviewItem] = useState(null);
    const [loading, setLoading] = useState(true);

    const openReview = (id) => {
        const selected = historyItems.find((item) => (item?._id || item?.id) === id) || null;
        setReviewItem(selected ? JSON.parse(JSON.stringify(selected)) : null);
    };

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/mock-test/${level}/history`);
            return;
        }

        const loadHistory = async () => {
            if (!isReady) {
                return;
            }

            if (!user) {
                setHistoryItems(loadLocalTestHistory("mock-test", level).filter((item) => item?.type === "mock-test" && item?.level === level));
                setLoading(false);
                return;
            }

            try {
                const res = await fetchTestHistory("mock-test", level);
                setHistoryItems(res.data || []);
            } catch (err) {
                setHistoryItems([]);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [rawLevel, level, router, isReady, user]);

    const rows = useMemo(() => historyItems.slice(0, 10), [historyItems]);

    return (
        <section className="dashboard-shell space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-mocktest-bg)] text-[var(--icon-mocktest)]">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("mockTest.historyTitle", "Lịch sử Kiểm tra")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">{rows.length} {t("common.records", "bản ghi")}</p>
                    </div>
                </div>

                <Link
                    href="/mock-test"
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-mocktest-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-mocktest)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {loading ? (
                <LoadingState message={t("mockTest.loading", "Đang tải dữ liệu...")} />
            ) : rows.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("mockTest.historyEmpty", "Chưa có lịch sử kiểm tra cho mức này.")}
                </p>
            ) : (
                <div className="space-y-2">
                    {rows.map((item) => (
                        <div
                            key={item._id || item.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                                    {cleanTestTitle(item.testTitle || item.title || item.testId || t("mockTest.historyItemLabel", "Bài kiểm tra"), level, t("mockTest.historyItemLabel", "Bài kiểm tra"))}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">
                                    {t("mockTest.historyDateLabel", "Ngày làm")}: {formatDateTime(item.createdAt, locale)}
                                    {" | "}
                                    {t("mockTest.historyDurationLabel", "Thời gian làm")}: {formatDuration(item.durationSeconds)}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <p className="text-sm text-[var(--color-text-soft)]">
                                    {item.correct ?? 0}/{item.total ?? 0} - {item.percentage ?? 0}%
                                </p>
                                <button
                                    type="button"
                                    onClick={() => openReview(item._id || item.id)}
                                    aria-label={t("mockTest.review", "Xem lại")}
                                    title={t("mockTest.review", "Xem lại")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-soft)] transition hover:border-[var(--color-border)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text)]"
                                >
                                    <Eye className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <TestHistoryReviewModal
                key={reviewItem?._id || reviewItem?.id || "review-item"}
                open={Boolean(reviewItem)}
                item={reviewItem}
                title={cleanTestTitle(reviewItem?.testTitle || reviewItem?.title || reviewItem?.testId || t("mockTest.historyTitle", "Lịch sử Kiểm tra"), level, t("mockTest.historyItemLabel", "Bài kiểm tra"))}
                sourceLabel={`${t("mockTest.historyTitle", "Lịch sử Kiểm tra")} - ${level}`}
                onClose={() => setReviewItem(null)}
            />
        </section>
    );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import LoadingState from "@/components/LoadingState";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import { useAuth } from "@/src/shared/hooks/useAuth";
import { fetchTestHistory, loadLocalTestHistory } from "@/src/services/history.service";

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

export default function ReadingHistoryPage() {
    const { isReady, user } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();
    const params = useParams();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const locale = mapLanguageToLocale(language);

    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/reading/${level}/history`);
            return;
        }

        const loadHistory = async () => {
            if (!isReady) {
                return;
            }

            if (!user) {
                setHistoryItems(loadLocalTestHistory("reading", level));
                setLoading(false);
                return;
            }

            try {
                const res = await fetchTestHistory("reading", level);
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
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-reading-bg)] text-[var(--icon-reading)]">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("reading.historyTitle", "Lich su lam bai")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">{rows.length} {t("common.records", "ban ghi")}</p>
                    </div>
                </div>

                <Link
                    href={`/reading/${level}`}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-reading-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-reading)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lai</span>
                </Link>
            </div>

            {loading ? (
                <LoadingState message={t("reading.loading", "Dang tai du lieu...")} />
            ) : rows.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    {t("reading.historyEmpty", "Chua co lich su luyen go.")}
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
                                    {item.testTitle || item.title || t("reading.defaultPracticeTitle", "Luyen go")}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">
                                    {t("reading.historyDateLabel", "Ngay lam")}: {formatDateTime(item.createdAt, locale)}
                                    {" | "}
                                    {t("reading.historyDurationLabel", "Thoi gian lam")}: {formatDuration(item.durationSeconds)}
                                </p>
                            </div>
                            <p className="shrink-0 text-sm text-[var(--color-text-soft)]">
                                {item.correct ?? 0}/{item.total ?? 0} - {item.percentage ?? 0}%
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

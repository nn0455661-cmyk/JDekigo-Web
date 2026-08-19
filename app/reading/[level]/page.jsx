"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, ChevronRight, Mic2, Speech } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState from "@/components/LoadingState";
import RubyText from "@/components/feature/RubyText";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as readingService from "src/services/reading.service";

export default function ReadingLevelPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const { t } = useLanguage();
    const isSpeakingReading = pathname?.startsWith("/speaking/");
    const levelRoute = isSpeakingReading ? `/speaking/${level}/reading` : `/reading/${level}`;
    const levelPickerRoute = isSpeakingReading ? "/speaking" : "/reading";

    const [items, setItems] = useState(() => {
        const cached = readingService.getCachedReadingByLevel(level) || readingService.getCachedReadings();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !(readingService.getCachedReadingByLevel(level) || readingService.getCachedReadings()));

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(isSpeakingReading ? `/speaking/${level}/reading` : `/reading/${level}`);
            return;
        }

        const fetchReading = async () => {
            try {
                const result = await readingService.getReadingByLevel(level);
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchReading();
    }, [rawLevel, level, router, isSpeakingReading]);

    const filteredItems = useMemo(
        () => items.filter((item) => item.level === level),
        [items, level]
    );

    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-reading-bg)] text-[var(--icon-reading)]">
                        <Speech className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("reading.title")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">{filteredItems.length} bài đọc</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={levelPickerRoute}
                        className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-reading-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-reading)] transition hover:opacity-90"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="back-label">Quay lại</span>
                    </Link>
                </div>
            </div>

            {isSpeakingReading ? (
                <div className="inline-flex w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] sm:w-auto">
                    <Link
                        href={`/speaking/${level}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-primary)] sm:flex-none"
                    >
                        <Mic2 className="h-4 w-4" />
                        Phần nói
                    </Link>
                    <Link
                        href={`/speaking/${level}/reading`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white sm:flex-none"
                    >
                        <BookOpenText className="h-4 w-4" />
                        Luyện đọc
                    </Link>
                </div>
            ) : null}

            {loading ? (
                <LoadingState message={t("reading.loading")} />
            ) : filteredItems.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Chưa có bài đọc cho cấp độ {level}.
                </p>
            ) : (
                <div className="grid gap-3">
                    {filteredItems.map((passage, index) => {
                        return (
                            <Link
                                key={passage.id}
                                href={`${levelRoute}/${encodeURIComponent(String(passage.id))}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
                            >
                                <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)] sm:text-sm">
                                    <RubyText text={passage.title} />
                                </p>
                                <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-text-soft)]" />
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

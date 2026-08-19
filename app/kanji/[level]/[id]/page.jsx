"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import Card from "@/components/Card";
import RubyText from "@/components/feature/RubyText";
import LoadingState from "@/components/LoadingState";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import * as kanjiService from "src/services/kanji.service";

export default function KanjiDetailPage() {
    function normalizeKanjiExampleLine(text) {
        let normalized = String(text || "").replace(/\s+/g, " ").trim();

        if (!normalized) {
            return "";
        }

        if (normalized.includes("|")) {
            return normalized
                .split(/\s*\|\s*/)
                .map((part) => normalizeKanjiExampleLine(part))
                .filter(Boolean)
                .join("\n");
        }

        while (normalized) {
            const hasArrow = /→|=>/.test(normalized);
            const separatorPattern = hasArrow ? /\s*(?:→|=>)\s*/ : /\s*\|\s*/;
            const joiner = hasArrow ? " → " : " | ";
            const parts = normalized.split(separatorPattern).map((part) => part.trim()).filter(Boolean);

            if (parts.length < 2) {
                return normalized;
            }

            const firstHalfLength = Math.floor(parts.length / 2);
            const isDuplicatedPair = parts.length % 2 === 0 && firstHalfLength > 0;
            if (isDuplicatedPair) {
                const firstHalf = parts.slice(0, firstHalfLength).join(joiner);
                const secondHalf = parts.slice(firstHalfLength).join(joiner);

                if (firstHalf === secondHalf) {
                    normalized = firstHalf;
                    continue;
                }
            }

            return parts.join(joiner);
        }

        return normalized;
    }

    function parseKanjiExamples(exampleText) {
        const uniqueDisplays = new Set();

        return String(exampleText || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const display = normalizeKanjiExampleLine(line);

                if (!display) {
                    return null;
                }

                if (uniqueDisplays.has(display)) {
                    return null;
                }

                uniqueDisplays.add(display);

                return { display };
            })
            .filter(Boolean);
    }
    const { t } = useLanguage();
    const params = useParams();
    const level = normalizeLevel(params?.level || DEFAULT_LEVEL);
    const id = Number(params?.id);

    const [items, setItems] = useState(() => {
        const cached = kanjiService.getCachedKanji();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !kanjiService.getCachedKanji());

    useEffect(() => {
        const fetchKanji = async () => {
            try {
                const result = await kanjiService.getKanji();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchKanji();
    }, []);

    const current = useMemo(
        () => items.find((item) => item.id === id && item.level === level),
        [id, items, level]
    );

    const relatedInSameLevel = useMemo(
        () => items.filter((item) => item.level === level && item.id !== id).slice(0, 4),
        [id, items, level]
    );

    return (
        <section className="dashboard-shell space-y-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="section-title">{t("kanji.title")} - {level}</h1>
                    <p className="text-sm text-[var(--color-text-soft)]">Chi tiết ký tự và chữ kết hợp liên quan</p>
                </div>
                <Link
                    href="/kanji"
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-kanji-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-kanji)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {loading ? (
                <LoadingState message={t("kanji.loading")} />
            ) : !current ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Không tìm thấy ký tự ở cấp độ {level}.
                </p>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <Card>
                        <span className="chip">{current.level}</span>
                        <div className="mt-4 text-center">
                            {current.drawingImage ? (
                                <div className="relative mx-auto h-[clamp(180px,36vh,460px)] w-full max-w-[460px]">
                                    <Image
                                        src={current.drawingImage}
                                        alt={`stroke-${current.kanji}`}
                                        fill
                                        sizes="(max-width: 640px) 100vw, 460px"
                                        className="img-fixed-contain"
                                    />
                                </div>
                            ) : (
                                <p className="text-7xl font-black text-[var(--color-text)]">{current.kanji}</p>
                            )}
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-left">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{t("kanji.onyomi")}</p>
                                    <p className="mt-2 text-2xl font-semibold leading-tight text-[var(--color-text)] sm:text-3xl">
                                        {current.onyomi || "-"}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-4 text-left">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">{t("kanji.kunyomi")}</p>
                                    <p className="mt-2 text-2xl font-semibold leading-tight text-[var(--color-text)] sm:text-3xl">
                                        {current.kunyomi || "-"}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-[var(--color-text-soft)] sm:text-[15px]">{current.meaning}</p>
                            {(current.hanviet || current.reading) ? (
                                <p className="mt-1 text-sm font-semibold text-[var(--color-text)] sm:text-base">
                                    {current.hanviet ? `${current.hanviet} - ` : ""}{current.reading || ""}
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-6">
                            <h2 className="text-sm font-semibold text-[var(--color-text)]">Một vài chữ kết hợp liên quan ({level})</h2>
                            <div className="mt-3 space-y-2">
                                {parseKanjiExamples(current.example).length > 0 ? (
                                    parseKanjiExamples(current.example).map((example) => (
                                        <div key={`${current.id}-${example.word}-${example.meaning}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text)]">
                                            <p className="whitespace-pre-line font-medium text-[var(--color-text)]"><RubyText text={example.display} /></p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-soft)]">
                                        {normalizeKanjiExampleLine(current.example) || "Chưa có ví dụ."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-2 text-[var(--color-text)]">
                            <Sparkles className="h-4 w-4" />
                            <h2 className="text-sm font-semibold">Kanji cùng cấp độ {level}</h2>
                        </div>

                        {relatedInSameLevel.length === 0 ? (
                            <p className="mt-3 text-sm text-[var(--color-text-soft)]">Hiện chưa có thêm dữ liệu cùng cấp độ.</p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {relatedInSameLevel.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={`/kanji/${item.level}/${item.id}`}
                                        className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm transition hover:bg-[var(--color-bg-soft)]"
                                    >
                                        <span className="font-bold text-[var(--color-text)]">{item.kanji}</span>
                                        <span className="text-[var(--color-text-soft)]">{item.meaning}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </section>
    );
}

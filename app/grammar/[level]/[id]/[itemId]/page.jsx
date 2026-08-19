"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    BookOpenText,
    CircleAlert,
    Lightbulb,
    Pencil,
    Puzzle,
    Sparkles,
} from "lucide-react";
import RubyText from "@/components/feature/RubyText";
import LoadingState from "@/components/LoadingState";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import RequireAuth from "@/components/auth/RequireAuth";
import * as grammarService from "src/services/grammar.service";

const grammarTagClass = {
    V: "bg-[#FFE6CF] text-[#B14A00] border-[#FFD0A6]",
    A: "bg-[#DDF3E4] text-[#1D7A44] border-[#BFE6CB]",
    N: "bg-[#DCEBFF] text-[#1E5FAF] border-[#BDD8FF]",
};

function renderFormulaFragment(fragment, indexPrefix) {
    const trimmed = String(fragment || "");

    if (!trimmed) {
        return null;
    }

    return (
        <RubyText
            key={`${indexPrefix}-text`}
            text={trimmed}
            className="font-semibold text-[var(--icon-grammar)]"
            rtClassName="text-[0.64em] font-semibold text-[var(--icon-grammar)]"
        />
    );
}

function renderFormulaLine(line, lineIndex) {
    const parts = String(line || "").split(/([NAV]\d*)/g);

    return (
        <div key={`formula-line-${lineIndex}`} className="whitespace-pre-wrap text-sm font-semibold leading-relaxed sm:text-base md:text-lg">
            {parts.filter(Boolean).map((part, index) => {
                const symbol = part.match(/^([NAV])\d*$/)?.[1];

                if (symbol) {
                    return (
                        <span
                            key={`${part}-${index}`}
                            className={`inline-flex items-center align-middle rounded-lg border px-1.5 py-0.5 mx-1 text-xs font-black tracking-wide sm:text-sm ${grammarTagClass[symbol]}`}
                        >
                            {part}
                        </span>
                    );
                }

                const fragments = String(part)
                    .split(/(は|ですか|です|どちら|いつ|何（なん）|何\(なん\)|何（なに）|何\(なに\)|何|なん)/g)
                    .filter(Boolean);

                return fragments.map((fragment, fragmentIndex) => renderFormulaFragment(fragment, `${lineIndex}-${index}-${fragmentIndex}`));
            })}
        </div>
    );
}

function MasuCutTag({ index }) {
    return (
        <span
            key={`masu-cut-${index}`}
            className="relative inline-flex items-center px-0.5 text-[var(--color-text)]"
        >
            <span>ます</span>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 top-1/2 border-t-2 border-[var(--color-primary)]"
                style={{ transform: "translateY(-50%) rotate(-22deg)" }}
            />
        </span>
    );
}

function StrikeText({ children }) {
    return (
        <span className="relative inline-flex items-center px-0.5 text-[var(--color-text)]">
            <span>{children}</span>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 top-1/2 border-t-2 border-[var(--color-primary)]"
                style={{ transform: "translateY(-50%) rotate(-18deg)" }}
            />
        </span>
    );
}

function renderStrikeTokens(text, indexPrefix) {
    const chunks = String(text || "").split(/(~{1,2}[^~]+~{1,2})/g).filter(Boolean);

    if (chunks.length === 1) {
        return [
            <span key={`${indexPrefix}-plain`} className="whitespace-pre-wrap">
                {text}
            </span>,
        ];
    }

    return chunks.map((chunk, idx) => {
        const doubleStrike = chunk.match(/^~~(.+)~~$/);
        const singleStrike = chunk.match(/^~(.+)~$/);

        if (doubleStrike || singleStrike) {
            return (
                <StrikeText key={`${indexPrefix}-strike-${idx}`}>
                    {(doubleStrike || singleStrike)[1]}
                </StrikeText>
            );
        }

        return (
            <span key={`${indexPrefix}-text-${idx}`} className="whitespace-pre-wrap">
                {chunk}
            </span>
        );
    });
}

function renderMasuCut(text, indexPrefix) {
    const chunks = text.split("{ます}");

    if (chunks.length === 1) {
        return [
            <span key={`${indexPrefix}-plain`} className="whitespace-pre-wrap">
                {text}
            </span>,
        ];
    }

    const nodes = [];
    chunks.forEach((chunk, idx) => {
        if (chunk) {
            nodes.push(
                <span key={`${indexPrefix}-text-${idx}`} className="whitespace-pre-wrap">
                    {chunk}
                </span>
            );
        }

        if (idx < chunks.length - 1) {
            nodes.push(<MasuCutTag key={`${indexPrefix}-masu-${idx}`} index={`${indexPrefix}-${idx}`} />);
        }
    });

    return nodes;
}

function FormulaWithColoredTags({ formula = "" }) {
    const lines = String(formula || "").split(/\r?\n/);

    return (
        <div className="mt-2 space-y-1 text-xs leading-snug text-[var(--icon-grammar)] sm:text-sm md:text-base">
            {lines.filter((line) => line !== "").map((line, index) => renderFormulaLine(line, index))}
        </div>
    );
}

export default function GrammarDetailPage() {
    const { t } = useLanguage();
    const params = useParams();
    const level = normalizeLevel(params?.level || DEFAULT_LEVEL);
    const lessonId = Number(params?.id);
    const itemId = String(params?.itemId || "");

    const [items, setItems] = useState(() => {
        const cached = grammarService.getCachedGrammar();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !grammarService.getCachedGrammar());

    useEffect(() => {
        const fetchGrammar = async () => {
            try {
                const result = await grammarService.getGrammar();
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchGrammar();
    }, []);

    const current = useMemo(
        () => items.find((item) => String(item.id) === itemId && item.level === level),
        [itemId, items, level]
    );

    const currentLessonOrder = useMemo(() => {
        const lessonOrderValue = Number(current?.lessonOrder);
        return lessonOrderValue || lessonId;
    }, [current?.lessonOrder, lessonId]);



    const renderExampleLine = (example) => {
        const jpText = String(example?.jp || "").trim();
        const viText = String(example?.vi || "").trim();
        const dialogueSegments = Array.isArray(example?.dialogueSegments) && example.dialogueSegments.length > 0
            ? example.dialogueSegments.map((segment) => String(segment || "").trim()).filter(Boolean)
            : viText.split(/\s*\|\s*/).map((segment) => segment.trim()).filter(Boolean);

        const renderMutedJapaneseSegment = (text, key) => (
            <p key={key} className="text-sm text-[var(--color-text-soft)] sm:text-base">
                <RubyText
                    text={text}
                    className="text-[var(--color-text-soft)]"
                    rtClassName="text-[0.55em] text-[var(--color-text-soft)]"
                />
            </p>
        );

        if (jpText && viText) {
            return (
                <div className="space-y-1 text-sm leading-snug text-[var(--color-text-soft)] sm:text-base">
                    <p className="flex flex-wrap items-baseline gap-x-1 text-sm leading-snug sm:text-base">
                        <RubyText
                            text={jpText}
                            className="text-sm leading-snug text-[var(--color-text)] sm:text-base"
                            rtClassName="text-[0.52em] text-[var(--color-text)]"
                        />
                        <span className="shrink-0 text-[var(--color-text-soft)]">→</span>
                        <span className="whitespace-pre-wrap text-sm leading-snug text-[var(--color-text-soft)] sm:text-base">
                            <RubyText
                                text={dialogueSegments[0] || viText}
                                className="text-[var(--color-text-soft)]"
                                rtClassName="text-[0.55em] text-[var(--color-text-soft)]"
                            />
                        </span>
                    </p>
                    {dialogueSegments.slice(1).map((segment, index) => renderMutedJapaneseSegment(segment, `${jpText}-${index}`))}
                </div>
            );
        }

        return (
            <p className="text-sm leading-snug text-[var(--color-text)] sm:text-base">
                <RubyText
                    text={jpText || viText}
                    className="text-sm leading-snug text-[var(--color-text)] sm:text-base"
                    rtClassName="text-[0.52em] text-[var(--color-text)]"
                />
            </p>
        );
    };

    return (
        <RequireAuth>
            <section className="dashboard-shell space-y-6 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="section-title">
                            {t("grammar.title")} - {level}
                        </h1>
                        <p className="text-sm text-[var(--color-text-soft)]">
                            {t("grammar.detailSubtitle", "Chi tiết mẫu ngữ pháp và ví dụ thực tế")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/grammar/${level}/${currentLessonOrder}`}
                            className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-grammar-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-grammar)] transition hover:opacity-90"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="back-label">Quay lại</span>
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <LoadingState message={t("grammar.loading")} />
                ) : !current ? (
                    <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                        {t("grammar.noLevelData", "Chưa có bài học cho cấp độ")} {level}.
                    </p>
                ) : (
                    <div className="grid items-start gap-4">
                        <div className="overflow-hidden rounded-[22px] border border-[#f2d9b9] bg-[var(--color-surface)] p-3 shadow-[0_12px_35px_rgba(121,75,31,0.06)] sm:p-5">
                            <span className="inline-flex rounded-full bg-[#fbf3e9] px-4 py-1.5 text-xs font-bold text-[#8b6c4c]">
                                {current.level}
                            </span>

                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                <article className="relative min-h-36 overflow-hidden rounded-2xl border border-[#f2dfba] bg-[#fffdf6] p-4 sm:p-5">
                                    <div className="inline-block">
                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#3d3a36]">
                                            <Pencil className="h-5 w-5 text-[#9a63db]" />
                                            <h2>{t("grammar.formula", "Công thức")}</h2>
                                        </div>
                                        <div className="mt-1.5 h-[3px] w-[calc(100%+0.75rem)] rounded-full bg-[#9a63db]/50" />
                                    </div>
                                    <div className="mt-4 text-base leading-relaxed sm:pl-1 sm:text-lg">
                                        <FormulaWithColoredTags formula={current.structure} />
                                    </div>
                                    <Image
                                        src="/images/grammar-stickers/formula.png"
                                        alt=""
                                        width={62}
                                        height={56}
                                        className="pointer-events-none absolute right-2 top-2 h-12 w-auto select-none sm:right-3 sm:top-3 sm:h-14"
                                        aria-hidden="true"
                                    />
                                </article>

                                <article className="relative min-h-36 overflow-hidden rounded-2xl border border-[#f2dfba] bg-[#fffdf7] p-4 sm:p-5">
                                    <div className="inline-block">
                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#3d3a36]">
                                            <Lightbulb className="h-5 w-5 fill-[#ffd85a] text-[#eebc25]" />
                                            <h2>{t("grammar.meaning", "Nghĩa")}</h2>
                                        </div>
                                        <div className="mt-1.5 h-[3px] w-[calc(100%+0.75rem)] rounded-full bg-[#eebc25]/50" />
                                    </div>
                                    <p className="relative z-10 mt-4 whitespace-pre-line break-words pr-14 text-sm leading-relaxed text-[var(--color-text)] sm:pr-16 sm:text-base">
                                        {current.meaning}
                                    </p>
                                    <Image
                                        src="/images/grammar-stickers/meaning.png"
                                        alt=""
                                        width={46}
                                        height={52}
                                        className="pointer-events-none absolute bottom-2 right-2 h-11 w-auto select-none sm:h-[52px]"
                                        aria-hidden="true"
                                    />
                                </article>

                                <article className="relative min-h-36 overflow-hidden rounded-2xl border border-[#dbead8] bg-[#f9fdf8] p-4 sm:p-5">
                                    <div className="inline-block">
                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#3d3a36]">
                                            <Puzzle className="h-5 w-5 fill-[#68c596] text-[#45ad78]" />
                                            <h2>{t("grammar.usageRange", "Cách dùng")}</h2>
                                        </div>
                                        <div className="mt-1.5 h-[3px] w-[calc(100%+0.75rem)] rounded-full bg-[#45ad78]/50" />
                                    </div>
                                    <p className="relative z-10 mt-4 whitespace-pre-line break-words pr-16 text-sm leading-relaxed text-[var(--color-text)] sm:pr-20 sm:text-base">
                                        {current.usage}
                                    </p>
                                    <Image
                                        src="/images/grammar-stickers/usage.png"
                                        alt=""
                                        width={64}
                                        height={96}
                                        className="pointer-events-none absolute bottom-0 right-1 h-24 w-auto select-none sm:right-2 sm:h-28"
                                        aria-hidden="true"
                                    />
                                </article>

                                <article className="relative min-h-36 overflow-hidden rounded-2xl border border-[#f3d9df] bg-[#fff9fb] p-4 sm:p-5">
                                    <div className="inline-block">
                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#3d3a36]">
                                            <CircleAlert className="h-5 w-5 fill-[#f485aa] text-white" />
                                            <h2>{t("grammar.notes", "Chú ý")}</h2>
                                        </div>
                                        <div className="mt-1.5 h-[3px] w-[calc(100%+0.75rem)] rounded-full bg-[#f485aa]/50" />
                                    </div>
                                    <p className="relative z-10 mt-4 whitespace-pre-line break-words pr-16 text-sm leading-relaxed text-[var(--color-text)] sm:pr-20 sm:text-base">
                                        <RubyText text={current.notes} />
                                    </p>
                                    <Image
                                        src="/images/grammar-stickers/notes.png"
                                        alt=""
                                        width={52}
                                        height={66}
                                        className="pointer-events-none absolute bottom-2 right-2 h-16 w-auto select-none sm:h-[72px]"
                                        aria-hidden="true"
                                    />
                                </article>
                            </div>

                            <div className="mt-6">
                                <div className="inline-block">
                                    <div className="flex items-center gap-2 text-[#45317d]">
                                        <BookOpenText className="h-5 w-5 fill-[#91b8ed] text-[#477bc4]" />
                                        <h2 className="text-base font-extrabold uppercase tracking-wide">
                                            {t("grammar.examples", "Ví dụ")}
                                        </h2>
                                    </div>
                                    <div className="mt-1.5 h-[3px] w-[calc(100%+0.75rem)] rounded-full bg-[#efa5b7]" />
                                </div>

                                <div className="mt-4 space-y-2.5">
                                    {(current.examples || []).map((example, index) => (
                                        <div
                                            key={`${current.id}-${index}`}
                                            className="rounded-xl border border-[#f2d8d5] bg-[#fffafa] px-4 py-3 transition-colors hover:bg-[#fff6f6] sm:px-5"
                                        >
                                            {renderExampleLine(example)}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {String(current.tip || "").trim() ? (
                                <div className="relative mt-5 min-h-32 overflow-hidden rounded-2xl border border-[#ded9ee] bg-[#faf8ff] px-4 py-4 sm:px-5">
                                    <div className="inline-block">
                                        <div className="flex items-center gap-2 text-sm font-extrabold uppercase text-[#5e4a9b]">
                                            <Lightbulb className="h-5 w-5 fill-[#ffe46f] text-[#e2b928]" />
                                            <h2>{t("grammar.memoryTip", "Mẹo nhớ")}</h2>
                                        </div>
                                        <div className="mt-1.5 h-[3px] w-[calc(100%+0.75rem)] rounded-full bg-[#e2b928]/50" />
                                    </div>
                                    <p className="relative z-10 mt-3 whitespace-pre-line pr-20 text-xs leading-relaxed text-[var(--color-text-soft)] sm:pr-28 sm:text-sm">
                                        {current.tip}
                                    </p>
                                    <Image
                                        src="/images/grammar-stickers/tip.png"
                                        alt=""
                                        width={86}
                                        height={116}
                                        className="pointer-events-none absolute bottom-0 right-1 h-28 w-auto select-none sm:right-3 sm:h-32"
                                        aria-hidden="true"
                                    />
                                </div>
                            ) : null}

                        </div>


                    </div>
                )}
            </section>
        </RequireAuth>
    );
}

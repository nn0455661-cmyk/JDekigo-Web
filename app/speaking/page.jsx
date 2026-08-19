"use client";

import Link from "next/link";
import { Mic2, Volume2, ListChecks, CheckCircle2, Sparkles } from "lucide-react";
import { prefetchSpeakingLevel } from "@/src/services/speaking.service";
import { useContentStats } from "@/hooks/useContentCounts";

const LEVELS = [
    { level: "JPD113", note: "JPD113 - Nền tảng - Speaking", tone: "warm" },
    { level: "JPD123", note: "JPD123 - Tăng tốc - Speaking", tone: "cool" },
];

export default function SpeakingPage() {
    const statsSpeaking = useContentStats("speaking");

    const trainingFeatures = [
        "Luyện nghe và nói lại theo từng cụm ngắn",
        "Luyện gõ hiragana để ghi nhớ câu hoàn chỉnh",
        "Xây phản xạ trả lời và tăng tự tin giao tiếp",
    ];

    return (
        <section className="dashboard-shell space-y-3 p-3 sm:p-4">
            <header className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-speaking-bg)] text-[var(--color-primary)] shadow-[0_10px_24px_rgba(255,107,0,0.08)]">
                    <Mic2 className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="section-title">Speaking</h1>
                </div>
            </header>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-soft)] shadow-[0_6px_18px_rgba(47,42,36,0.04)]">
                Chọn cấp độ để luyện theo 2 tab: Phần nói và Luyện đọc.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {LEVELS.map((item) => (
                    <Link
                        key={item.level}
                        href={`/speaking/${item.level}`}
                        onMouseEnter={() => prefetchSpeakingLevel(item.level)}
                        onFocus={() => prefetchSpeakingLevel(item.level)}
                        onTouchStart={() => prefetchSpeakingLevel(item.level)}
                        className={[
                            "group flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border text-left shadow-[var(--shadow-card)] transition",
                            "hover:scale-[1.005]",
                            item.tone === "warm" ? "border-[#ffb366] bg-[#fff4df]" : "border-[#78b6f0] bg-[#e4f1ff]",
                        ].join(" ")}
                    >
                        <div className={`${item.tone === "warm" ? "bg-[#fff4df]" : "bg-[#e4f1ff]"} px-4 py-5`}>
                            <p className="text-center text-4xl font-black tracking-tight text-[#2f2a24]">{item.level}</p>
                        </div>
                        <div className={`${item.tone === "warm" ? "bg-[#ef8a2f]" : "bg-[#3f87c8]"} flex flex-col items-center justify-center px-4 py-5 text-white`}>
                            <Volume2 className="h-9 w-9" />
                            <p className="mt-3 text-center text-sm font-bold text-white/95">{item.note}</p>
                        </div>
                        <div className={`${item.tone === "warm" ? "bg-[#fff4df]" : "bg-[#e4f1ff]"} flex-1`} />
                    </Link>
                ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
                <article className="surface-card p-3 lg:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-[var(--color-primary)]">
                        <Sparkles className="h-4 w-4" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">Tổng quan nhanh</h2>
                    </div>
                    <p className="mb-2 text-sm text-[var(--color-text-soft)]">Tổng số lượng bài nói và bài đọc hiện có theo cấp độ.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {["JPD113", "JPD123"].map((level) => (
                            <div key={level} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2.5">
                                <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{level}</p>
                                <div className="mt-1 flex items-center gap-4">
                                    <div>
                                        <p className="mt-0.5 text-2xl font-bold leading-tight text-[var(--color-text)]">
                                            {statsSpeaking.speakingItems?.[level] || 0}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-soft)]">bài nói</p>
                                    </div>
                                    <span className="text-[var(--color-text-soft)] opacity-30 text-xl font-light">|</span>
                                    <div>
                                        <p className="mt-0.5 text-2xl font-bold leading-tight text-[var(--color-text)]">
                                            {statsSpeaking.readingItems?.[level] || 0}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-soft)]">bài đọc</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="surface-card p-3 lg:col-span-1">
                    <div className="mb-2 flex items-center gap-2 text-[var(--color-primary)]">
                        <ListChecks className="h-4 w-4" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
                            Tính năng chính
                        </h2>
                    </div>
                    <ul className="space-y-1.5 text-sm text-[var(--color-text)]">
                        {trainingFeatures.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[var(--color-primary)]" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </article>
            </div>
        </section>
    );
}


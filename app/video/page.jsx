"use client";

import Link from "next/link";
import { CheckCircle2, Film, PlayCircle, Sparkles, Target, ListChecks } from "lucide-react";
import { useContentStats } from "@/src/shared/hooks/useContentCounts";

const LEVELS = [
    { level: "JPD113", note: "JPD113 - Nền tảng - Video", tone: "warm" },
    { level: "JPD123", note: "JPD123 - Tăng tốc - Video", tone: "cool" },
];

export default function VideoPage() {
    const statsVideo = useContentStats("video");

    return (
        <section className="dashboard-shell space-y-3 p-3 sm:p-4">
            <header className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-video-bg)] text-[var(--icon-video)] shadow-[0_10px_24px_rgba(6,182,212,0.16)]">
                    <Film className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="section-title">Video</h1>
                </div>
            </header>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-soft)] shadow-[0_6px_18px_rgba(47,42,36,0.04)]">
                Chọn cấp độ để xem các video bài giảng.
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {LEVELS.map((item) => (
                    <Link
                        key={item.level}
                        href={`/video/${item.level}`}
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
                            <PlayCircle className="h-9 w-9" />
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
                    <p className="mb-2 text-sm text-[var(--color-text-soft)]">Số lượng video hiện có theo từng cấp độ.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {["JPD113", "JPD123"].map((level) => (
                            <div key={level} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2.5">
                                <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{level}</p>
                                <div className="mt-1 flex items-center gap-3">
                                    <div>
                                        <p className="text-2xl font-bold leading-tight text-[var(--color-text)]">
                                            {statsVideo.counts?.[level] ?? "..."}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-soft)]">video</p>
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
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[var(--color-primary)]" />
                            <span>Cung cấp video bài giảng củng cố kiến thức</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[var(--color-primary)]" />
                            <span>Hỗ trợ tài liệu mở rộng cho quá trình tự học</span>
                        </li>
                    </ul>
                </article>
            </div>
        </section>
    );
}


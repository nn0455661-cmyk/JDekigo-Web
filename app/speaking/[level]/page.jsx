"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Mic2, BookOpen } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import { listSpeakingLevel } from "@/src/services/speaking.service";

export default function SpeakingLevelPage(props) {
    const params = use(props.params);
    const level = String(params?.level || "JPD113").toUpperCase();
    const [sets, setSets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadSets = async () => {
            try {
                const next = await listSpeakingLevel(level);
                if (mounted) setSets(next);
            } catch {
                if (mounted) setSets([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadSets();
        return () => { mounted = false; };
    }, [level]);

    return (
        <section className="dashboard-shell space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-speaking-bg)] text-[var(--color-primary)]"><Mic2 className="h-5 w-5" /></div>
                    <div><h1 className="section-title">Speaking - {level}</h1><p className="text-sm text-[var(--color-text-soft)]">Chọn đề để luyện phần nói và phần đọc.</p></div>
                </div>
                <Link href="/speaking" className="back-action inline-flex items-center gap-2 rounded-xl bg-[var(--icon-speaking-bg)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)]"><ChevronLeft className="h-4 w-4" /><span className="back-label">Quay lại</span></Link>
            </div>

            {loading ? <LoadingState message="Đang tải danh sách đề..." /> : sets.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">Chưa có đề speaking được xuất bản cho {level}.</p>
            ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {sets.map((item, index) => {
                        const speakingCount = Array.isArray(item.speakingItems) && item.speakingItems.length ? item.speakingItems.length : item.audioUrl ? 1 : 0;
                        const readingCount = Array.isArray(item.readingItems) ? item.readingItems.length : 0;
                        return (
                            <Link key={item.id} href={`/speaking/${level}/${item.id}`} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]">
                                <div className="p-4 pb-4">
                                    <div className="flex items-start justify-between gap-3"><p className="text-lg font-black uppercase text-[var(--color-primary)]">{item.title || `Đề ${item.setOrder || index + 1}`}</p><FileText className="h-6 w-6 shrink-0 text-[var(--color-primary)]" /></div>
                                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--color-text-soft)]">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Mic2 className="h-4 w-4 shrink-0 text-red-500" />
                                                <span>{speakingCount} bài nói</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 shrink-0" />
                                                <span>{readingCount} bài đọc</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
                                    </div>
                                </div>
                                <div className="relative w-full h-24 sm:h-28 overflow-hidden border-t border-[var(--color-border)]">
                                    <Image
                                        src="/images/japanese_pink_bridge_custom.png"
                                        alt="Japanese Theme"
                                        fill
                                        sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

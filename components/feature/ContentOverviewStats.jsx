"use client";

import { Sparkles } from "lucide-react";
import { SUPPORTED_LEVELS } from "@/constants/levels";

export default function ContentOverviewStats({
    title,
    description,
    counts,
    unitLabel,
    totalLabel,
}) {
    const total = SUPPORTED_LEVELS.reduce((sum, level) => sum + Number(counts?.[level] || 0), 0);

    return (
        <article className="surface-card p-3 lg:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-[var(--color-primary)]">
                <Sparkles className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{title}</h2>
            </div>
            {description ? <p className="mb-2 text-sm text-[var(--color-text-soft)]">{description}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
                {SUPPORTED_LEVELS.map((level) => (
                    <div key={level} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-2.5">
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{level}</p>
                        <p className="mt-0.5 text-2xl font-bold leading-tight text-[var(--color-text)]">
                            {counts?.[level] ?? "..."}
                        </p>
                        <p className="text-xs text-[var(--color-text-soft)]">{unitLabel}</p>
                    </div>
                ))}
            </div>
            {totalLabel ? (
                <p className="mt-2 text-xs text-[var(--color-text-soft)]">
                    {totalLabel}: <span className="font-semibold text-[var(--color-text)]">{total}</span>
                </p>
            ) : null}
        </article>
    );
}

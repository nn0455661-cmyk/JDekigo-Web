"use client";

import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import { SUPPORTED_LEVELS } from "@/constants/levels";

const paletteByLevel = {
    JPD113: {
        top: "bg-[#fff4df]",
        bottom: "bg-[#ef8a2f]",
        accent: "border-[#ffb366]",
        base: "bg-[#fff4df]",
    },
    JPD123: {
        top: "bg-[#e4f1ff]",
        bottom: "bg-[#3f87c8]",
        accent: "border-[#78b6f0]",
        base: "bg-[#e4f1ff]",
    },
};

function LevelCard({
    level,
    value,
    onChange,
    countByLevel,
    categoryLabel,
    routeBase,
    lessonsLabel,
    courseLabel,
    trackByLevel,
    compact,
    showCounts,
    countByLevelOverride,
}) {
    const isActive = value === level;
    const palette = paletteByLevel[level];
    const hasOverrideCount = countByLevelOverride && Object.prototype.hasOwnProperty.call(countByLevelOverride, level);
    const displayCount = hasOverrideCount
        ? (countByLevelOverride[level] ?? "...")
        : countByLevel[level];
    const className = `overflow-hidden rounded-2xl border text-left shadow-[var(--shadow-card)] transition flex h-full flex-col ${compact ? "min-h-[260px]" : ""} ${palette.base} ${palette.accent} ${isActive ? "scale-[1.01] ring-2 ring-[var(--color-primary)]" : "hover:scale-[1.005]"
        }`;
    const content = (
        <>
            <div className={`${palette.top} px-4 ${compact ? "py-5" : "py-4"}`}>
                <p className={`text-center font-black tracking-tight text-[#2f2a24] ${compact ? "text-4xl" : "text-5xl"}`}>{level}</p>
            </div>
            <div className={`${palette.bottom} flex flex-col items-center justify-center px-4 ${compact ? "py-5" : "py-3"} text-white`}>
                {showCounts ? (
                    <>
                        <p className={`text-center font-bold ${compact ? "text-2xl" : "text-3xl"}`}>{displayCount}</p>
                        <p className={`text-center font-medium ${compact ? "text-xs" : "text-sm"}`}>{lessonsLabel}</p>
                    </>
                ) : (
                    <p className={`text-center font-bold ${compact ? "text-xl" : "text-2xl"}`}>{lessonsLabel}</p>
                )}
                <p className={`text-center text-white/90 ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>
                    {courseLabel}
                </p>
                <p className={`text-center text-white/85 ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs"}`}>
                    {trackByLevel[level]} - {categoryLabel}
                </p>
            </div>
            {compact ? <div className={`${palette.base} flex-1`} /> : null}
        </>
    );

    if (routeBase) {
        return (
            <Link
                key={level}
                href={`${routeBase}/${level}`}
                className={className}
            >
                {content}
            </Link>
        );
    }

    return (
        <button key={level} type="button" onClick={() => onChange(level)} className={className}>
            {content}
        </button>
    );
}

export default function LevelFilterCards({ value, onChange, items = [], categoryLabel = "", routeBase = "", compact = false, showCounts = true, countByLevel: countByLevelOverride }) {
    const { t } = useLanguage();
    const trackByLevel = {
        JPD113: t("levelFilter.trackJPD113", "Sơ cấp 1"),
        JPD123: t("levelFilter.trackJPD123", "Sơ cấp 2"),
    };
    const lessonsLabel = t("levelFilter.lessons", "bài học");
    const courseLabel = t("levelFilter.course", " Dekiru Nihongo");

    const countByLevel = SUPPORTED_LEVELS.reduce((acc, level) => {
        const lessonKeys = new Set(
            items
                .filter((item) => item.level === level)
                .map((item) => {
                    if (item.lessonId || item.topicId) {
                        return `${item.topicId || "other"}::${item.lessonId || "common"}`;
                    }

                    return String(
                        item.id ?? item.lessonTitle ?? item.title ?? item.word ?? item.kanji ?? item.grammar ?? item.reading ?? "unknown"
                    );
                })
        );

        acc[level] = lessonKeys.size;
        return acc;
    }, {});

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {SUPPORTED_LEVELS.map((level) => (
                <LevelCard
                    key={level}
                    level={level}
                    value={value}
                    onChange={onChange}
                    countByLevel={countByLevel}
                    categoryLabel={categoryLabel}
                    routeBase={routeBase}
                    lessonsLabel={lessonsLabel}
                    courseLabel={courseLabel}
                    trackByLevel={trackByLevel}
                    compact={compact}
                    showCounts={showCounts}
                    countByLevelOverride={countByLevelOverride}
                />
            ))}
        </div>
    );
}

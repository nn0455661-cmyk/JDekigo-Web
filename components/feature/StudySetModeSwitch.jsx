"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleDot, Layers, Zap } from "lucide-react";
import studysetService from "@/src/services/studyset.service";

const modes = [
    {
        key: "flashcard",
        href: "flashcard",
        labelKey: "studySet.modeFlashcard",
        fallback: "Flashcard",
        icon: Layers,
        className: "border-[#a9c8ff] bg-[#edf3ff] text-[#1b4fb6]",
        activeClassName: "ring-[#7ca0e6]",
    },
    {
        key: "quiz",
        href: "quiz",
        labelKey: "studySet.modeQuiz",
        fallback: "Trac nghiem",
        icon: CircleDot,
        className: "border-[#98e1b3] bg-[#eaf9ef] text-[#0f8a46]",
        activeClassName: "ring-[#74cb94]",
    },
    {
        key: "recall",
        href: "recall",
        labelKey: "studySet.modeRecall",
        fallback: "Nhoi nhet",
        icon: Zap,
        className: "border-[#ffbf8f] bg-[#fff4ea] text-[#c85a00]",
        activeClassName: "ring-[#f09c6f]",
    },
];

export default function StudySetModeSwitch({ studySetId, activeMode, cardCount = 0, t, onModeChange, hideRecall = false }) {
    const router = useRouter();

    const prefetchMode = (href) => {
        studysetService.prefetchStudySets();
        router.prefetch(href);
    };

    const filteredModes = hideRecall ? modes.filter(m => m.key !== "recall") : modes;

    return (
        <div className={`grid gap-2 ${hideRecall ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {filteredModes.map((mode) => {
                const Icon = mode.icon;
                const active = activeMode === mode.key;
                const disabled = cardCount === 0;
                const className = `flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${mode.className} ${active ? `ring-2 ${mode.activeClassName}` : ""} ${disabled ? "pointer-events-none opacity-55" : "hover:-translate-y-0.5 hover:shadow-sm"}`;

                if (onModeChange) {
                    return (
                        <button
                            key={mode.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => onModeChange(mode.key)}
                            className={className}
                        >
                            <Icon className="h-4 w-4" />
                            {t(mode.labelKey, mode.fallback)}
                        </button>
                    );
                }

                return (
                    <Link
                        key={mode.key}
                        href={`/study-set/${studySetId}/${mode.href}`}
                        onMouseEnter={() => prefetchMode(`/study-set/${studySetId}/${mode.href}`)}
                        onFocus={() => prefetchMode(`/study-set/${studySetId}/${mode.href}`)}
                        onTouchStart={() => prefetchMode(`/study-set/${studySetId}/${mode.href}`)}
                        aria-disabled={disabled}
                        className={className}
                    >
                        <Icon className="h-4 w-4" />
                        {t(mode.labelKey, mode.fallback)}
                    </Link>
                );
            })}
        </div>
    );
}

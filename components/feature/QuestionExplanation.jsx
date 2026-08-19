"use client";

import { Lightbulb } from "lucide-react";
import RubyText from "@/components/feature/RubyText";

export default function QuestionExplanation({ explanation, showFurigana = false, className = "" }) {
    const content = String(explanation || "").trim();

    if (!content) {
        return null;
    }

    return (
        <aside
            className={`rounded-2xl border border-[#cfe3dc] bg-[#f1f8f5] px-4 py-3 text-[#315f52] shadow-[0_8px_24px_rgba(64,122,105,0.08)] dark:border-[#355f54] dark:bg-[#18352f] dark:text-[#cce9df] ${className}`}
            aria-label="Giải thích đáp án"
        >
            <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#dcefe8] text-[#347561] dark:bg-[#285247] dark:text-[#aee1d2]">
                    <Lightbulb className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em]">Giải thích</p>
                    <RubyText
                        text={content}
                        showFurigana={showFurigana}
                        className="mt-1 block whitespace-pre-line text-xs leading-relaxed sm:text-sm"
                        rtClassName="text-[8px] opacity-70 sm:text-[10px]"
                    />
                </div>
            </div>
        </aside>
    );
}

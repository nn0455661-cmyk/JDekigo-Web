"use client";

import { useMemo, useState } from "react";
import Button from "@/components/Button";
import { useLanguage } from "@/hooks/useLanguage";
import { Bot, Plus } from "lucide-react";

async function getSuggestion(term) {
    const response = await fetch(`/api/dictionary/suggest?term=${encodeURIComponent(term)}`);
    if (!response.ok) {
        throw new Error("SUGGEST_FAILED");
    }

    const payload = await response.json();
    return payload?.data || payload;
}

function formatSuggestedMeaning(data) {
    return [data?.reading, data?.meaning].filter(Boolean).join(" - ");
}

export default function StudySetCardEditor({ onAddCard }) {
    const { t } = useLanguage();
    const [term, setTerm] = useState("");
    const [meaning, setMeaning] = useState("");
    const [example, setExample] = useState("");
    const [suggestion, setSuggestion] = useState({ meaning: "", example: "" });
    const [isSuggesting, setIsSuggesting] = useState(false);

    const disabledAdd = useMemo(() => !term.trim(), [term]);

    const suggestNow = async () => {
        if (!term.trim()) {
            return;
        }

        setIsSuggesting(true);
        try {
            const data = await getSuggestion(term.trim());
            const nextMeaning = formatSuggestedMeaning(data);
            const nextExample = data.example || "";

            setSuggestion({ meaning: nextMeaning, example: nextExample });
            setMeaning(nextMeaning);
            setExample(nextExample);
        } catch {
            const fallbackMeaning = t("studySet.autoFallbackMeaning");
            const fallbackExample = `私は毎日「${term.trim()}」という言葉を使って練習しています。`;

            setSuggestion({ meaning: fallbackMeaning, example: fallbackExample });
            setMeaning(fallbackMeaning);
            setExample(fallbackExample);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleAdd = async () => {
        let nextMeaning = meaning.trim();
        let nextExample = example.trim();

        if (!nextMeaning || !nextExample) {
            try {
                const data = await getSuggestion(term.trim());
                nextMeaning = nextMeaning || formatSuggestedMeaning(data);
                nextExample = nextExample || data.example || "";
            } catch {
                nextMeaning = nextMeaning || t("studySet.autoFallbackMeaning");
                nextExample =
                    nextExample || `私は毎日「${term.trim()}」という言葉を使って練習しています。`;
            }
        }

        onAddCard({
            term: term.trim(),
            meaning: nextMeaning,
            example: nextExample,
        });

        setTerm("");
        setMeaning("");
        setExample("");
        setSuggestion({ meaning: "", example: "" });
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text)]">{t("studySet.term")}</label>
                    <input
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder={t("studySet.termPlaceholder")}
                        className="form-control"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text)]">{t("studySet.meaning")}</label>
                    <input
                        value={meaning}
                        onChange={(e) => setMeaning(e.target.value)}
                        placeholder={t("studySet.meaningPlaceholder")}
                        className="form-control"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">{t("studySet.example")}</label>
                <textarea
                    value={example}
                    onChange={(e) => setExample(e.target.value)}
                    placeholder={t("studySet.examplePlaceholder")}
                    className="form-control min-h-[90px]"
                />
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text-soft)]">
                <p className="inline-flex items-center gap-2 font-semibold text-[var(--color-text)]">
                    <Bot className="h-4 w-4 text-[var(--color-primary)]" />
                    {t("studySet.autoHint")}
                </p>
                <p className="mt-2">{t("studySet.meaning")}: <span className="font-medium text-[var(--color-text)]">{suggestion.meaning || "-"}</span></p>
                <p className="mt-1">{t("studySet.example")}: <span className="font-medium text-[var(--color-text)]">{suggestion.example || "-"}</span></p>
                <button
                    type="button"
                    onClick={suggestNow}
                    disabled={!term.trim() || isSuggesting}
                    className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] disabled:opacity-60"
                >
                    {isSuggesting ? t("studySet.suggesting") : t("studySet.autoSuggestNow")}
                </button>
            </div>

            <Button onClick={handleAdd} className="inline-flex gap-2" disabled={disabledAdd}>
                <Plus className="h-4 w-4" />
                {t("studySet.addCard")}
            </Button>
        </div>
    );
}

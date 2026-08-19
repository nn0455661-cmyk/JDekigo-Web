"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Pencil, Trash2, Plus, X, Sparkles } from "lucide-react";

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

function renderFormattedText(text, className, numbered = false) {
    const value = String(text || "");
    const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length <= 1) {
        return <p className={className}>{value}</p>;
    }

    if (!numbered) {
        return <p className={`${className} whitespace-pre-line`}>{value}</p>;
    }

    return (
        <ol className={`${className} list-decimal pl-5`}>
            {lines.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
            ))}
        </ol>
    );
}

function hasJapaneseKana(text) {
    return /[\u3040-\u30ff]/.test(String(text || ""));
}

function resolveCardDisplay(card) {
    let reading = String(card?.reading || "").trim();
    let hanviet = String(card?.hanviet || "").trim();
    let meaning = String(card?.meaning || "").trim();

    if (!reading && !hanviet && meaning) {
        const lines = meaning
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const headerParts = String(lines[0] || "").split(/\s+-\s+/);

        if (headerParts.length === 2 && (hasJapaneseKana(headerParts[0]) || hasJapaneseKana(headerParts[1]))) {
            const [firstPart, secondPart] = headerParts;
            reading = hasJapaneseKana(firstPart) ? firstPart : secondPart;
            hanviet = hasJapaneseKana(firstPart) ? secondPart : firstPart;
            meaning = lines.slice(1).join("\n");
        }
    }

    return { reading, hanviet, meaning };
}

export default function StudySetCardsPreview({ cards, onAddCard, onUpdateCard, onDeleteCard }) {
    const { t } = useLanguage();
    const [editingCardId, setEditingCardId] = useState("");
    const [draft, setDraft] = useState({ term: "", meaning: "", note: "", noteMeaning: "" });
    const [isAdding, setIsAdding] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [newCard, setNewCard] = useState({ term: "", meaning: "", note: "", noteMeaning: "" });

    const canAdd = useMemo(() => newCard.term.trim().length > 0, [newCard.term]);

    const startEdit = (card) => {
        setEditingCardId(card.id);
        setDraft({
            term: card.term || "",
            meaning: card.meaning || "",
            note: card.note || "",
            noteMeaning: card.noteMeaning || "",
        });
    };

    const saveEdit = (card) => {
        onUpdateCard(card.id, {
            term: draft.term.trim(),
            meaning: draft.meaning.trim(),
            note: draft.note.trim(),
            noteMeaning: draft.noteMeaning.trim(),
        });

        setEditingCardId("");
        setDraft({ term: "", meaning: "", note: "", noteMeaning: "" });
    };

    const suggestMeaning = async () => {
        if (!newCard.term.trim()) {
            return;
        }

        setIsSuggesting(true);
        try {
            const data = await getSuggestion(newCard.term.trim());
            setNewCard((prev) => ({
                ...prev,
                meaning: prev.meaning.trim() ? prev.meaning : formatSuggestedMeaning(data),
                note: prev.note.trim() ? prev.note : data.example || "",
                noteMeaning: prev.noteMeaning.trim() ? prev.noteMeaning : `${t("studySet.noteMeaningTemplate", "Vi du ve")} ${newCard.term.trim()}`,
            }));
        } catch {
            setNewCard((prev) => ({
                ...prev,
                meaning: prev.meaning.trim() ? prev.meaning : t("studySet.autoFallbackMeaning"),
            }));
        } finally {
            setIsSuggesting(false);
        }
    };

    const addCard = async () => {
        if (!canAdd) {
            return;
        }

        let nextMeaning = newCard.meaning.trim();
        let nextNote = newCard.note.trim();
        let nextNoteMeaning = newCard.noteMeaning.trim();

        if (!nextMeaning) {
            try {
                const data = await getSuggestion(newCard.term.trim());
                nextMeaning = formatSuggestedMeaning(data);
                nextNote = nextNote || data.example || "";
                nextNoteMeaning = nextNoteMeaning || `${t("studySet.noteMeaningTemplate", "Vi du ve")} ${newCard.term.trim()}`;
            } catch {
                nextMeaning = t("studySet.autoFallbackMeaning");
                nextNoteMeaning = nextNoteMeaning || t("studySet.noteMeaningFallback", "Chua co nghia vi du.");
            }
        }

        if (nextNote && !nextNoteMeaning) {
            nextNoteMeaning = t("studySet.noteMeaningFallback", "Chua co nghia vi du.");
        }

        onAddCard({
            term: newCard.term.trim(),
            meaning: nextMeaning,
            note: nextNote,
            noteMeaning: nextNoteMeaning,
        });

        setNewCard({ term: "", meaning: "", note: "", noteMeaning: "" });
        setIsAdding(false);
    };

    return (
        <div className="mt-3 space-y-3">
            {cards.length === 0 ? (
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.noCards")}</p>
            ) : null}

            {cards.map((card, index) => {
                const display = resolveCardDisplay(card);

                return (
                <article
                    key={card.id}
                    className="rounded-xl border border-[#d6e1f2] bg-[#f8fbff] p-1.5 pb-2 text-[#26364d] shadow-sm"
                >
                    {editingCardId === card.id ? (
                        <div className="space-y-2">
                            <input
                                value={draft.term}
                                onChange={(event) => setDraft((prev) => ({ ...prev, term: event.target.value }))}
                                className="form-control h-8 py-1 text-sm"
                                placeholder={t("studySet.term")}
                            />
                            <textarea
                                value={draft.meaning}
                                onChange={(event) => setDraft((prev) => ({ ...prev, meaning: event.target.value }))}
                                className="form-control min-h-[72px] resize-y text-sm"
                                placeholder={t("studySet.meaning")}
                            />
                            <textarea
                                value={draft.note}
                                onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
                                className="form-control min-h-[70px] text-sm"
                                placeholder={t("studySet.example")}
                            />
                            <textarea
                                value={draft.noteMeaning}
                                onChange={(event) => setDraft((prev) => ({ ...prev, noteMeaning: event.target.value }))}
                                className="form-control min-h-[64px] resize-y text-sm"
                                placeholder={t("studySet.noteMeaningPlaceholder", "Nghia vi du")}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => saveEdit(card)}
                                    className="rounded-lg bg-[var(--color-primary)] px-2 py-1 text-xs font-semibold text-white"
                                >
                                    {t("studySet.save")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCardId("")}
                                    className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-soft)]"
                                >
                                    {t("studySet.cancel")}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-2.5">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <div className="shrink-0">
                                        <p className="text-[11px] font-semibold text-[#5b73a8]">{index + 1}.</p>
                                        <p className="text-base font-medium leading-none text-[#172033]">{card.word || card.term}</p>
                                    </div>

                                    <div className="min-w-0 space-y-0.5 border-l border-[#d7e0ef] pl-3">
                                        {display.reading ? (
                                            <p className="break-words text-xs leading-tight text-[#40577f]">{display.reading}</p>
                                        ) : null}
                                        {display.hanviet ? (
                                            <p className="break-words text-xs leading-tight text-[#4569b0]">{display.hanviet}</p>
                                        ) : null}
                                        {display.meaning ? (
                                            <div className="text-xs leading-tight text-[#172033]">
                                                {renderFormattedText(display.meaning, "text-xs leading-tight text-[#172033]")}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(card)}
                                        title={t("studySet.editCard")}
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[#b9c7df] bg-white text-[#526b9f] transition hover:border-[#7e94bd] hover:text-[#263f7c]"
                                    >
                                        <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteCard(card.id)}
                                        title={t("studySet.deleteCard")}
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[#b9c7df] bg-white text-[#526b9f] transition hover:border-[#e08a8a] hover:text-[#b42318]"
                                    >
                                        <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            </div>

                            {card.note || card.example ? (
                                <div className="mt-2 border-t border-[#d7e0ef] pt-2">
                                    {renderFormattedText(card.note || card.example, "text-xs text-[#26364d]")}
                                    <div className="mt-0.5">
                                        {renderFormattedText(card.noteMeaning || card.exampleMeaning, "text-xs text-[#63738d]")}
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </article>
                );
            })}

            {isAdding ? (
                <article className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                        <input
                            value={newCard.term}
                            onChange={(event) => setNewCard((prev) => ({ ...prev, term: event.target.value }))}
                            className="form-control"
                            placeholder={t("studySet.termPlaceholder")}
                        />
                        <textarea
                            value={newCard.meaning}
                            onChange={(event) => setNewCard((prev) => ({ ...prev, meaning: event.target.value }))}
                            className="form-control min-h-[72px] resize-y"
                            placeholder={t("studySet.meaningPlaceholder")}
                        />
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                            value={newCard.note}
                            onChange={(event) => setNewCard((prev) => ({ ...prev, note: event.target.value }))}
                            className="form-control"
                            placeholder={t("studySet.examplePlaceholder")}
                        />
                        <input
                            value={newCard.noteMeaning}
                            onChange={(event) => setNewCard((prev) => ({ ...prev, noteMeaning: event.target.value }))}
                            className="form-control"
                            placeholder={t("studySet.noteMeaningPlaceholder", "Nghia vi du")}
                        />
                        <div className="flex items-center gap-2 md:justify-end">
                            <button
                                type="button"
                                onClick={suggestMeaning}
                                disabled={!newCard.term.trim() || isSuggesting}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-60"
                                title={t("studySet.autoSuggestNow")}
                            >
                                <Sparkles className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={addCard}
                                disabled={!canAdd}
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {t("studySet.addCard")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewCard({ term: "", meaning: "", note: "", noteMeaning: "" });
                                }}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-soft)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </article>
            ) : (
                <div className="flex justify-center pt-1">
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-primary)] transition hover:-translate-y-0.5"
                        title={t("studySet.addCard")}
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

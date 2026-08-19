"use client";

import { useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useLanguage } from "@/hooks/useLanguage";
import { FileJson2, Wand2 } from "lucide-react";

const demoJson = [
    {
        word: "日本語",
        reading: "にほんご",
        hanviet: "NHẬT NGỮ",
        meaning: "Tiếng Nhật",
        note: "日本語を勉強しています。",
    },
    {
        word: "学生",
        reading: "がくせい",
        hanviet: "HỌC SINH",
        meaning: "Học sinh, sinh viên",
        note: "私は学生です。",
    },
];

const knownBulkFields = new Set([
    "word",
    "term",
    "reading",
    "hanviet",
    "hanViet",
    "meaning",
    "definition",
    "note",
    "example",
    "noteMeaning",
    "exampleMeaning",
]);

function formatExtraValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value).trim();
}

function normalizeBulkCards(input) {
    const rows = Array.isArray(input) ? input : [input];

    return rows
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const word = String(item.word || item.term || "").trim();
            const reading = String(item.reading || "").trim();
            const hanviet = String(item.hanviet || item.hanViet || "").trim();
            const meaning = String(item.meaning || item.definition || "").trim();
            const note = String(item.note || item.example || "").trim();
            const noteMeaning = String(item.noteMeaning || item.exampleMeaning || "").trim();
            const extraLines = Object.entries(item)
                .filter(([key]) => !knownBulkFields.has(key))
                .map(([key, value]) => {
                    const formatted = formatExtraValue(value);
                    return formatted ? `${key}: ${formatted}` : "";
                })
                .filter(Boolean);

            return {
                term: word,
                word,
                reading,
                hanviet,
                meaning,
                note: [note, ...extraLines].filter(Boolean).join("\n"),
                noteMeaning,
            };
        })
        .filter((item) => item.term && item.meaning);
}

export default function StudySetBulkImportPanel({ sets, onAddBulk }) {
    const { t } = useLanguage();
    const [selectedSetId, setSelectedSetId] = useState("");
    const [rawJson, setRawJson] = useState("");
    const [message, setMessage] = useState("");

    const resolveSelectedSetId = () => {
        const selectedValue = String(selectedSetId || "");
        const selectedSet = sets.find((set) =>
            [set._id, set.id, set.name]
                .filter(Boolean)
                .some((value) => String(value) === selectedValue)
        );

        return selectedSet?._id || selectedSet?.id || "";
    };

    const handleFillDemo = () => {
        setRawJson(JSON.stringify(demoJson, null, 2));
        setMessage("");
    };

    const handleImport = async () => {
        if (!selectedSetId) {
            setMessage(t("studySet.bulkSelectRequired"));
            return;
        }

        if (!rawJson.trim()) {
            setMessage(t("studySet.bulkJsonRequired"));
            return;
        }

        let parsed;
        try {
            parsed = JSON.parse(rawJson);
        } catch {
            setMessage(t("studySet.bulkInvalidJson"));
            return;
        }

        const cards = normalizeBulkCards(parsed);
        if (cards.length === 0) {
            setMessage(t("studySet.bulkNoValidRows"));
            return;
        }

        const targetSetId = resolveSelectedSetId();
        if (!targetSetId) {
            setMessage(t("studySet.bulkSelectRequired"));
            return;
        }

        try {
            await onAddBulk(targetSetId, cards);
            setRawJson("");
            setMessage(t("studySet.bulkAddedSuccess").replace("{count}", String(cards.length)));
        } catch (error) {
            setMessage(error?.message || t("studySet.bulkNoValidRows"));
        }
    };

    return (
        <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-bold text-[var(--color-text)]">{t("studySet.bulkTitle")}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleFillDemo}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]"
                    >
                        <Wand2 className="h-3.5 w-3.5" />
                        {t("studySet.bulkDemo")}
                    </button>
                </div>
            </div>

            <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.bulkSubtitle")}</p>
            <p className="rounded-lg bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-soft)]">
                {t("studySet.bulkGuide")}
            </p>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">{t("studySet.bulkChooseSet")}</label>
                <select
                    value={selectedSetId}
                    onChange={(e) => setSelectedSetId(e.target.value)}
                    className="form-control"
                >
                    <option value="">{t("studySet.bulkChooseSetPlaceholder")}</option>
                    {sets.map((set) => (
                        <option key={set._id || set.id} value={set._id || set.id}>
                            {set.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">JSON</label>
                <textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    placeholder={t("studySet.bulkJsonPlaceholder")}
                    className="form-control min-h-[220px] font-mono text-xs"
                />
            </div>

            <Button onClick={handleImport} className="inline-flex gap-2">
                <FileJson2 className="h-4 w-4" />
                {t("studySet.bulkAdd")}
            </Button>

            {message && <p className="text-sm font-medium text-[var(--color-primary)]">{message}</p>}
        </Card>
    );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import LoadingState from "@/components/LoadingState";
import { useLanguage } from "@/hooks/useLanguage";
import notify from "@/src/lib/notifier";
import studysetService from "@/src/services/studyset.service";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";

export default function StudySetListPanel({ sets, isLoading = false, onDelete, onRename }) {
    const router = useRouter();
    const { t } = useLanguage();
    const [editingSetId, setEditingSetId] = useState("");
    const [draftName, setDraftName] = useState("");
    const [savingSetId, setSavingSetId] = useState("");

    const startRename = (set) => {
        setEditingSetId(set._id);
        setDraftName(set.name);
    };

    const submitRename = async (setId) => {
        if (!draftName.trim()) {
            notify.error(null, t("studySet.requiredSetName", "Vui long nhap ten hoc phan."));
            return;
        }

        try {
            setSavingSetId(setId);
            await onRename(setId, draftName);
            setEditingSetId("");
            setDraftName("");
        } catch (error) {
            notify.error(error, t("studySet.renameError", "Khong the doi ten hoc phan."));
        } finally {
            setSavingSetId("");
        }
    };

    const prefetchSet = (setId) => {
        studysetService.prefetchStudySets();
        router.prefetch(`/study-set/${setId}`);
    };

    return (
        <Card className="space-y-3 p-5">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">{t("studySet.mySets")}</h2>
            {isLoading ? (
                <LoadingState message={t("studySet.loadingSets", "Đang tải học phần đã tạo...")} rows={3} compact />
            ) : sets.length === 0 ? (
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.emptySets")}</p>
            ) : (
                <div className="space-y-3">
                    {sets.map((set) => (
                        <article
                            key={set._id}
                            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    {editingSetId === set._id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={draftName}
                                                onChange={(event) => setDraftName(event.target.value)}
                                                className="form-control h-8 py-1 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => submitRename(set._id)}
                                                disabled={savingSetId === set._id}
                                                className="rounded-lg bg-[var(--color-primary)] px-2 py-1 text-xs font-semibold text-white"
                                            >
                                                {t("studySet.save")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingSetId("");
                                                    setDraftName("");
                                                }}
                                                className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-text-soft)]"
                                            >
                                                {t("studySet.cancel")}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-semibold text-[var(--color-text)]">{set.name}</p>
                                            <button
                                                type="button"
                                                onClick={() => startRename(set)}
                                                title={t("studySet.renameSet")}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-soft)] hover:text-[var(--color-primary)]"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(set._id)}
                                                title={t("studySet.deleteSet")}
                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-soft)] hover:text-[var(--color-primary)]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-xs text-[var(--color-text-soft)]">
                                        {set.cards.length} {t("studySet.cardsCount")}
                                    </p>
                                </div>
                                <div />
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-xs text-[var(--color-text-soft)]">{t("studySet.openToAddCards")}</p>
                                <Link
                                    href={`/study-set/${set._id}`}
                                    title={t("studySet.openSet")}
                                    onMouseEnter={() => prefetchSet(set._id)}
                                    onFocus={() => prefetchSet(set._id)}
                                    onTouchStart={() => prefetchSet(set._id)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                                >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </Card>
    );
}

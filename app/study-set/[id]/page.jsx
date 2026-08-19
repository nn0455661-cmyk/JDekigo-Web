"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/Card";
import LoadingState from "@/components/LoadingState";
import StudySetCardsPreview from "@/components/feature/StudySetCardsPreview";
import { useLanguage } from "@/hooks/useLanguage";
import { useStudySets } from "@/hooks/useStudySets";
import notify from "@/src/lib/notifier";
import studysetService from "@/src/services/studyset.service";
import { ChevronLeft, Layers, CircleDot, Zap, Pencil } from "lucide-react";

export default function StudySetDetailPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { id } = useParams();
    const { isReady, getSetById, renameSet, addCardToSet, updateCardInSet, deleteCardFromSet } = useStudySets();
    const [isRenaming, setIsRenaming] = useState(false);
    const [draftName, setDraftName] = useState("");
    const [savingName, setSavingName] = useState(false);
    const studySet = getSetById(id);

    useEffect(() => {
        if (!studySet || isRenaming) {
            return;
        }

        setDraftName(studySet.name);
    }, [isRenaming, studySet]);

    const startRename = () => {
        setDraftName(studySet?.name || "");
        setIsRenaming(true);
    };

    const cancelRename = () => {
        setDraftName(studySet?.name || "");
        setIsRenaming(false);
    };

    const submitRename = async () => {
        if (!studySet) {
            return;
        }

        if (!draftName.trim()) {
            notify.error(null, t("studySet.requiredSetName", "Vui long nhap ten hoc phan."));
            return;
        }

        try {
            setSavingName(true);
            await renameSet(studySet._id, draftName);
            setIsRenaming(false);
        } catch (error) {
            notify.error(error, t("studySet.renameError", "Khong the doi ten hoc phan."));
        } finally {
            setSavingName(false);
        }
    };

    const prefetchPractice = () => {
        if (!studySet?._id) {
            return;
        }

        studysetService.prefetchStudySets();
        router.prefetch(`/study-set/${studySet._id}/flashcard`);
    };

    const rememberPracticeMode = (mode) => {
        if (!studySet?._id || typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(`study-set-progress:${studySet._id}:mode`, mode);
    };

    if (!isReady) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <LoadingState message={t("common.loading", "Đang tải...")} />
            </section>
        );
    }

    if (!studySet) {
        return (
            <section className="surface-card rounded-2xl p-5">
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.notFound")}</p>
                <Link
                    href="/study-set"
                    className="mt-3 inline-flex rounded-lg bg-[var(--icon-studyset-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-studyset)]"
                >
                    {t("studySet.backToSets")}
                </Link>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <Card className="space-y-4 p-5">
                <Link
                    href="/study-set"
                    className="back-action inline-flex items-center gap-1 rounded-lg bg-[var(--icon-studyset-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--icon-studyset)] transition hover:opacity-90"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>

                <div>
                    {isRenaming ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                value={draftName}
                                onChange={(event) => setDraftName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void submitRename();
                                    }

                                    if (event.key === "Escape") {
                                        cancelRename();
                                    }
                                }}
                                className="form-control h-11 max-w-md text-lg font-semibold"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={submitRename}
                                disabled={savingName}
                                className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {savingName ? t("common.saving", "Dang luu...") : t("studySet.save", "Luu")}
                            </button>
                            <button
                                type="button"
                                onClick={cancelRename}
                                disabled={savingName}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {t("studySet.cancel", "Huy")}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold leading-tight text-[var(--color-text)] sm:text-3xl">{studySet.name}</h1>
                            <button
                                type="button"
                                onClick={startRename}
                                title={t("studySet.renameSet", "Doi ten")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-soft)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-primary)]"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    <p className="mt-1 text-sm text-[var(--color-text-soft)]">
                        {studySet.cards.length} {t("studySet.cardsCount", "the")}
                    </p>
                </div>
                <p className="text-sm text-[var(--color-text-soft)]">{t("studySet.studyModesSubtitle", "Chọn chế độ học trước khi vào màn luyện tập.")}</p>

                <div className="grid gap-3 lg:grid-cols-3">
                    <article className="flex h-full flex-col rounded-2xl border border-[#a9c8ff] bg-[#edf3ff] p-4">
                        <p className="inline-flex items-center gap-2 text-2xl font-bold text-[#1b4fb6]">
                            <Layers className="h-4 w-4" />
                            {t("studySet.modeFlashcard", "Flashcard")}
                        </p>
                        <p className="mt-2 min-h-[70px] text-base leading-6 text-[#1d4ed8]">{t("studySet.modeFlashcardDesc", "Lật thẻ để xem đáp án. Phù hợp để làm quen với từ vựng mới.")}</p>
                        <Link
                            href={`/study-set/${studySet._id}/flashcard`}
                            onClick={() => rememberPracticeMode("flashcard")}
                            onMouseEnter={prefetchPractice}
                            onFocus={prefetchPractice}
                            onTouchStart={prefetchPractice}
                            className={`mt-auto inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${studySet.cards.length
                                ? "bg-[#4f7fe0] shadow-[0_8px_18px_rgba(79,127,224,0.28)] ring-1 ring-[#9db9ff] transition hover:bg-[#416fd0] hover:shadow-[0_10px_22px_rgba(79,127,224,0.34)]"
                                : "pointer-events-none cursor-not-allowed bg-[#7ca0e6]/55"
                                }`}
                            aria-disabled={studySet.cards.length === 0}
                        >
                            {t("studySet.startFlashcard", "Bắt đầu Flashcard")}
                        </Link>
                    </article>

                    <article className="flex h-full flex-col rounded-2xl border border-[#98e1b3] bg-[#eaf9ef] p-4">
                        <p className="inline-flex items-center gap-2 text-2xl font-bold text-[#0f8a46]">
                            <CircleDot className="h-4 w-4" />
                            {t("studySet.modeQuiz", "Trắc nghiệm")}
                        </p>
                        <p className="mt-2 min-h-[70px] text-base leading-6 text-[#067647]">{t("studySet.modeQuizDesc", "Xem từ vựng, chọn đáp án nhanh để kiểm tra kiến thức.")}</p>
                        <Link
                            href={`/study-set/${studySet._id}/flashcard`}
                            onClick={() => rememberPracticeMode("quiz")}
                            onMouseEnter={prefetchPractice}
                            onFocus={prefetchPractice}
                            onTouchStart={prefetchPractice}
                            className={`mt-auto inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${studySet.cards.length ? "bg-[#31b764] shadow-[0_8px_18px_rgba(49,183,100,0.28)] ring-1 ring-[#8be3aa] transition hover:bg-[#279f55] hover:shadow-[0_10px_22px_rgba(49,183,100,0.34)]" : "pointer-events-none cursor-not-allowed bg-[#74cb94]/55"}`}
                            aria-disabled={studySet.cards.length === 0}
                        >
                            {t("studySet.startQuiz", "Bắt đầu Trắc nghiệm")}
                        </Link>
                    </article>

                    <article className="flex h-full flex-col rounded-2xl border border-[#ffbf8f] bg-[#fff4ea] p-4">
                        <p className="inline-flex items-center gap-2 text-2xl font-bold text-[#c85a00]">
                            <Zap className="h-4 w-4" />
                            {t("studySet.modeRecall", "Nhồi nhét")}
                        </p>
                        <p className="mt-2 min-h-[70px] text-base leading-6 text-[#e85f00]">{t("studySet.modeRecallDesc", "Gõ đáp án để ghi nhớ sâu hơn. Dành cho người muốn thử thách.")}</p>
                        <Link
                            href={`/study-set/${studySet._id}/flashcard`}
                            onClick={() => rememberPracticeMode("recall")}
                            onMouseEnter={prefetchPractice}
                            onFocus={prefetchPractice}
                            onTouchStart={prefetchPractice}
                            className={`mt-auto inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${studySet.cards.length ? "bg-[#f47b42] shadow-[0_8px_18px_rgba(244,123,66,0.28)] ring-1 ring-[#ffb487] transition hover:bg-[#df6833] hover:shadow-[0_10px_22px_rgba(244,123,66,0.34)]" : "pointer-events-none cursor-not-allowed bg-[#f09c6f]/55"}`}
                            aria-disabled={studySet.cards.length === 0}
                        >
                            {t("studySet.startRecall", "Bắt đầu Nhồi nhét")}
                        </Link>
                    </article>
                </div>
            </Card>

            <Card className="p-5">
                <h2 className="text-xl font-bold text-[var(--color-text)]">{t("studySet.cardsInDraft", "Thẻ trong học phần")}</h2>
                <StudySetCardsPreview
                    cards={studySet.cards}
                    onAddCard={(card) => addCardToSet(studySet._id, card)}
                    onUpdateCard={(cardId, nextCard) => updateCardInSet(studySet._id, cardId, nextCard)}
                    onDeleteCard={(cardId) => deleteCardFromSet(studySet._id, cardId)}
                />
            </Card>
        </section>
    );
}

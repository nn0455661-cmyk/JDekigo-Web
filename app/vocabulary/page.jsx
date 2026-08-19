"use client";

import { useMemo } from "react";
import ContentOverviewStats from "@/components/feature/ContentOverviewStats";
import LevelFilterCards from "@/components/feature/LevelFilterCards";
import { BookOpen, CheckCircle2, Layers3, ListChecks } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useContentStats } from "@/hooks/useContentCounts";

export default function VocabularyPage() {
    const { t } = useLanguage();
    const stats = useContentStats("vocabulary");
    const learningFeatures = useMemo(() => [t("vocabulary.featureFlashcard"), t("vocabulary.featureReview"), t("vocabulary.featureMockTest")], [t]);
    const quizTypes = useMemo(() => [t("vocabulary.quizTypeMultipleChoice"), t("vocabulary.quizTypeReverseMeaning")], [t]);

    return (
        <section className="dashboard-shell space-y-3 p-3 sm:p-4">
            <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-vocabulary-bg)] text-[var(--icon-vocabulary)]">
                    <BookOpen className="h-5 w-5" />
                </div>
                <h1 className="section-title">{t("vocabulary.title")}</h1>
            </div>

            <div className="flex flex-col gap-3">
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5 text-sm text-[var(--color-text-soft)]">
                    {t("vocabulary.selectLevelPrompt")}
                </p>
                <LevelFilterCards categoryLabel={t("vocabulary.title")} routeBase="/vocabulary" compact countByLevel={stats.counts} />

                <div className="grid gap-3 lg:grid-cols-3">
                    <ContentOverviewStats
                        title={t("vocabulary.quickOverviewTitle")}
                        description={t("vocabulary.quickOverviewDesc")}
                        counts={stats.itemCounts}
                        unitLabel={t("vocabulary.wordsNeedToLearn")}
                    />

                    <article className="surface-card p-3 lg:col-span-1">
                        <div className="mb-2 flex items-center gap-2 text-[var(--color-primary)]">
                            <ListChecks className="h-4 w-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{t("vocabulary.featuresTitle")}</h2>
                        </div>
                        <ul className="space-y-1.5 text-sm text-[var(--color-text)]">
                            {learningFeatures.map((feature) => (
                                <li key={feature} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[var(--color-primary)]" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </article>

                    <article className="surface-card p-3 lg:col-span-3">
                        <div className="mb-2 flex items-center gap-2 text-[var(--color-primary)]">
                            <Layers3 className="h-4 w-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{t("vocabulary.quizTypesTitle")}</h2>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {quizTypes.map((quizType) => (
                                <div key={quizType} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm leading-tight text-[var(--color-text)]">
                                    {quizType}
                                </div>
                            ))}
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}

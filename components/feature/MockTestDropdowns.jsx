"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, ClipboardCheck, Clock3, FileText, History } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import { cachedRequest, getCachedValue, prefetchCachedRequest, stableCacheKey } from "@/src/lib/client-cache";
import { useLanguage } from "@/hooks/useLanguage";

function getMockTestDataKey(level) {
    return stableCacheKey("mock-test:data", { level: String(level || "").toUpperCase() });
}

async function fetchMockTestLevelData(level) {
    const response = await fetch(`/api/mock-test-data?level=${encodeURIComponent(level)}`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || "Could not load test data.");
    }

    return payload?.data || payload;
}

export default function MockTestDropdowns({ testsByLevel = {} }) {
    const { t } = useLanguage();
    const [levelData, setLevelData] = useState(testsByLevel);
    const [openLevel, setOpenLevel] = useState(null);
    const [openMiniGroup, setOpenMiniGroup] = useState("");
    const levelStatusRef = useRef({});

    const loadLevelData = useCallback(async (level) => {
        const currentStatus = levelStatusRef.current[level];
        if (currentStatus === "loading" || currentStatus === "loaded") {
            return;
        }

        const cached = getCachedValue(getMockTestDataKey(level));
        if (cached) {
            levelStatusRef.current[level] = "loaded";
            setLevelData((previous) => ({
                ...previous,
                [level]: {
                    ...cached,
                    isLoading: false,
                    isLoaded: true,
                    error: "",
                },
            }));
            return;
        }

        levelStatusRef.current[level] = "loading";
        setLevelData((previous) => {
            const current = previous[level];
            return {
                ...previous,
                [level]: {
                    ...(current || {}),
                    isLoading: true,
                    error: "",
                },
            };
        });

        try {
            const data = await cachedRequest(getMockTestDataKey(level), () => fetchMockTestLevelData(level), { ttlMs: 2 * 60 * 1000 });
            levelStatusRef.current[level] = "loaded";
            setLevelData((previous) => ({
                ...previous,
                [level]: {
                    ...data,
                    isLoading: false,
                    isLoaded: true,
                    error: "",
                },
            }));
        } catch (error) {
            levelStatusRef.current[level] = "error";
            setLevelData((previous) => ({
                ...previous,
                [level]: {
                    ...(previous[level] || {}),
                    isLoading: false,
                    isLoaded: false,
                    error: t("mockTestDropdowns.loadError"),
                },
            }));
        }
    }, [t]);

    useEffect(() => {
        Object.keys(testsByLevel).forEach((level) => {
            void loadLevelData(level);
        });
    }, [loadLevelData, testsByLevel]);

    const prefetchLevel = (level) => {
        const current = levelData[level];
        if (current?.isLoaded || current?.isLoading) return;
        prefetchCachedRequest(getMockTestDataKey(level), () => fetchMockTestLevelData(level), { ttlMs: 2 * 60 * 1000 });
    };

    const toggleLevel = (level) => {
        const nextOpenLevel = openLevel === level ? null : level;
        setOpenLevel(nextOpenLevel);
        setOpenMiniGroup("");
        if (nextOpenLevel) void loadLevelData(level);
    };

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(levelData).map(([level, data]) => {
                const isOpen = openLevel === level;
                const isLoading = Boolean(data.isLoading);
                const miniGroups = Array.isArray(data.miniGroups) 
                    ? [...data.miniGroups].map(group => ({
                        ...group,
                        tests: Array.isArray(group.tests) ? [...group.tests].sort((a, b) => (a.testTitle || "").localeCompare(b.testTitle || "", undefined, { numeric: true, sensitivity: 'base' })) : []
                      }))
                    : [];
                const fullTests = Array.isArray(data.fullTests) 
                    ? [...data.fullTests].sort((a, b) => (a.testTitle || "").localeCompare(b.testTitle || "", undefined, { numeric: true, sensitivity: 'base' }))
                    : [];

                return (
                    <div key={level} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-[rgba(255,120,0,0.18)] bg-white px-4 py-3" onMouseEnter={() => prefetchLevel(level)} onFocus={() => prefetchLevel(level)} onTouchStart={() => prefetchLevel(level)}>
                            <button type="button" onClick={() => toggleLevel(level)} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                                <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">{t("nav.mockTest")}</p><p className="mt-1 text-lg font-black text-[var(--color-text)]">{level}</p></div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{t("mockTestDropdowns.expand")}</span>
                            </button>
                            <Link href={`/mock-test/${level}/history`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"><History className="h-4 w-4" /></Link>
                        </div>

                        {isOpen ? (
                            <div className="grid gap-4 border-t border-[var(--color-border)] p-4 lg:grid-cols-2">
                                <section className="rounded-3xl border border-[rgba(255,107,0,0.22)] bg-[var(--color-surface)] p-5 shadow-[0_16px_42px_rgba(255,107,0,0.08)]">
                                    <div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white"><FileText className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">{t("mockTestDropdowns.randomLabel")}</p><h3 className="text-lg font-black text-[var(--color-text)]">{t("mockTest.fullTestTitle")}</h3></div></div>
                                    {isLoading ? (
                                        <LoadingState className="mt-5" message={t("mockTestDropdowns.loadingBank")} rows={2} compact />
                                    ) : data.error ? (
                                        <div className="mt-5 rounded-2xl border border-dashed border-red-200 bg-white px-4 py-4 text-sm text-red-600">
                                            <p className="font-semibold">{t("mockTestDropdowns.loadDataFailed")}</p>
                                            <p className="mt-1">{t("mockTestDropdowns.reloadHint")}</p>
                                        </div>
                                    ) : fullTests.length > 0 ? (
                                        <div className="mt-5 space-y-2 pt-2">
                                            {fullTests.map((test) => (
                                                <Link
                                                    key={test.id}
                                                    href={`/mock-test/${level}/test/${test.id}`}
                                                    className="group flex items-center justify-between gap-3 rounded-2xl border border-[rgba(255,107,0,0.16)] bg-[var(--color-surface)] px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(47,42,36,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-orange-50 hover:shadow-[0_12px_26px_rgba(255,107,0,0.12)] focus:outline-none"
                                                >
                                                    <div className="min-w-0">
                                                        <span className="block truncate font-semibold text-[var(--color-text)] transition group-hover:text-[var(--color-primary)]">{test.testTitle}</span>
                                                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[var(--color-text-soft)]">
                                                            <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-[var(--color-primary)]" />{test.totalQuestions || 0} câu</span>
                                                            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[var(--color-primary)]" />{test.timeLimit || 0} phút</span>
                                                        </span>
                                                    </div>
                                                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,107,0,0.12)] text-[var(--color-primary)] transition group-hover:translate-x-0.5 group-hover:bg-[var(--color-primary)] group-hover:text-white">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-5 rounded-2xl border border-dashed border-[rgba(255,107,0,0.28)] bg-white px-4 py-4 text-sm text-[var(--color-text-soft)]">
                                            <p className="font-semibold text-[var(--color-text)]">Hiện chưa có đề</p>
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-3xl border border-[rgba(124,58,237,0.18)] bg-[var(--color-surface)] p-5 shadow-[0_16px_42px_rgba(91,33,182,0.07)]">
                                    <div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7c3aed] text-white"><ClipboardCheck className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c3aed]">{t("mockTestDropdowns.setLabel")}</p><h3 className="text-lg font-black text-[var(--color-text)]">{t("mockTestDropdowns.miniTestTitle")}</h3></div></div>
                                    <div className="mt-5 space-y-2">
                                        {isLoading ? <LoadingState message={t("mockTestDropdowns.loadingMini")} rows={2} compact /> : data.error ? <p className="rounded-xl border border-dashed border-red-200 p-4 text-sm text-red-600">{t("mockTestDropdowns.loadError")}</p> : miniGroups.length ? miniGroups.map((group) => {
                                            const groupOpen = openMiniGroup === group.id;
                                            return (
                                                <div
                                                    key={group.id}
                                                    className={`overflow-hidden rounded-2xl border bg-white transition duration-200 ${groupOpen ? "border-[rgba(124,58,237,0.28)] shadow-[0_12px_30px_rgba(124,58,237,0.10)]" : "border-[rgba(124,58,237,0.16)] hover:border-[rgba(124,58,237,0.28)] hover:bg-white hover:shadow-[0_10px_24px_rgba(124,58,237,0.08)]"}`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenMiniGroup(groupOpen ? "" : group.id)}
                                                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[rgba(124,58,237,0.06)]"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate font-black text-[var(--color-text)]">{group.title}</p>
                                                            <p className="mt-0.5 text-xs font-medium text-[var(--color-text-soft)]">{group.tests.length} {t("mockTestDropdowns.testCount")}</p>
                                                        </div>
                                                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${groupOpen ? "border-[#7c3aed] bg-[#7c3aed] text-white" : "border-[rgba(124,58,237,0.18)] bg-white text-[#7c3aed]"}`}>
                                                            {groupOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </span>
                                                    </button>
                                                    <div
                                                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                                                            groupOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                                        }`}
                                                    >
                                                        <div className="overflow-hidden">
                                                            <div className="space-y-2 border-t border-[rgba(124,58,237,0.12)] bg-white p-3">
                                                                {group.tests.map((test) => (
                                                                    <Link
                                                                        key={test.id}
                                                                        href={`/mock-test/${level}/test/${test.id}`}
                                                                        className="group flex items-center justify-between gap-3 rounded-2xl border border-[rgba(124,58,237,0.16)] bg-[var(--color-surface)] px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(47,42,36,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#7c3aed] hover:bg-purple-50 hover:shadow-[0_12px_26px_rgba(124,58,237,0.12)] focus:outline-none"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <span className="block truncate font-semibold text-[var(--color-text)] transition group-hover:text-[#7c3aed]">{test.testTitle}</span>
                                                                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[var(--color-text-soft)]">
                                                                                <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-[#7c3aed]" />{test.totalQuestions || 0} câu</span>
                                                                                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#7c3aed]" />{test.timeLimit || 0} phút</span>
                                                                            </span>
                                                                        </div>
                                                                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(124,58,237,0.12)] text-[#7c3aed] transition group-hover:translate-x-0.5 group-hover:bg-[#7c3aed] group-hover:text-white">
                                                                            <ArrowRight className="h-4 w-4" />
                                                                        </span>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="rounded-xl border border-dashed p-4 text-sm text-[var(--color-text-soft)]">{t("mockTestDropdowns.emptyMini")}</p>}
                                    </div>
                                </section>
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

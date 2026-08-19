"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Clock3, FileText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import LoadingState from "@/components/LoadingState";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import { getTests } from "@/src/services/test.service";

export default function GrammarTestListPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();
    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(`/grammar/${level}/test`);
            return;
        }

        let mounted = true;

        const fetchTests = async () => {
            setLoading(true);
            try {
                const payload = await getTests({ level, module: "grammar", status: "published" });
                if (mounted) setTests(payload?.data?.items || []);
            } catch {
                if (mounted) setTests([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchTests();
        return () => {
            mounted = false;
        };
    }, [rawLevel, level, router]);

    const testOptions = useMemo(
        () => tests.map((test) => ({
            id: test.id,
            title: test.testTitle,
            href: `/grammar/${level}/test/${test.id}`,
            totalQuestions: test.totalQuestions || 0,
            minutes: test.timeLimit || 0,
        })),
        [level, tests]
    );

    return (
        <section className="dashboard-shell space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-grammar-bg)] text-[var(--icon-grammar)]">
                        <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="section-title">{t("grammar.testSetupTitle", "Đề kiểm tra ngữ pháp")} - {level}</h1>
                        <p className="text-sm text-[var(--color-text-soft)]">Bài kiểm tra được tạo và publish từ admin.</p>
                    </div>
                </div>

                <Link
                    href={`/grammar/${level}`}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-grammar-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-grammar)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {loading ? (
                <LoadingState message={t("common.loading", "Đang tải...")} />
            ) : testOptions.length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Chưa có bài kiểm tra được tạo từ admin cho phần này.
                </p>
            ) : (
                <div className="space-y-3">
                    {testOptions.map((test) => (
                        <Link
                            key={test.id}
                            href={test.href}
                            className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="inline-flex min-w-0 items-center gap-2 text-lg font-bold text-[var(--color-text)]">
                                    <FileText className="h-4 w-4 shrink-0 text-[var(--icon-grammar)]" />
                                    <span className="truncate">{test.title}</span>
                                </p>
                                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-text-soft)]">
                                    <Clock3 className="h-4 w-4" /> {test.totalQuestions} câu | {test.minutes} phút
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

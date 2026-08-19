import { Timer } from "lucide-react";
import MockTestDropdowns from "@/components/feature/MockTestDropdowns";
import { SUPPORTED_LEVELS } from "@/constants/levels";

const initialTestsByLevel = Object.fromEntries(SUPPORTED_LEVELS.map((level) => [level, {
    availableQuestionCount: 0,
    categoryCounts: {},
    distribution: { vocabulary: 10, kanji: 8, grammar: 10, reading: 2 },
    timeLimit: 30,
    miniGroups: [],
    isLoading: false,
    isLoaded: false,
    error: "",
}]));

export default function MockTestHubPage() {
    return (
        <section className="dashboard-shell space-y-4 p-4 sm:p-5">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--icon-mocktest-bg)] text-[var(--icon-mocktest)]">
                        <Timer className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-black leading-tight text-[var(--color-text)] sm:text-3xl">Kiểm tra</h1>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-soft)]">Chọn Kiểm tra tổng hợp hoặc các nhóm Kiểm tra nhỏ theo từng cấp độ.</p>
            </div>

            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <MockTestDropdowns testsByLevel={initialTestsByLevel} />
            </div>
        </section>
    );
}

"use client";

import StudySetCreatePanel from "@/components/feature/StudySetCreatePanel";
import StudySetBulkImportPanel from "@/components/feature/StudySetBulkImportPanel";
import StudySetListPanel from "@/components/feature/StudySetListPanel";
import { useStudySets } from "@/hooks/useStudySets";

export default function StudySetPage() {
    const { isReady, studySets, createSet, deleteSet, renameSet, addCardsToSet } = useStudySets({ revalidateOnMount: false });

    return (
        <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
            <div className="space-y-4">
                <StudySetCreatePanel onCreate={createSet} />
                <StudySetBulkImportPanel sets={studySets} onAddBulk={addCardsToSet} />
            </div>
            <StudySetListPanel
                sets={studySets}
                isLoading={!isReady}
                onDelete={deleteSet}
                onRename={renameSet}
            />
        </section>
    );
}

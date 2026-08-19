"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useLanguage } from "@/hooks/useLanguage";
import { BookCopy } from "lucide-react";

export default function StudySetCreatePanel({ onCreate }) {
    const router = useRouter();
    const { t } = useLanguage();
    const [setName, setSetName] = useState("");
    const [message, setMessage] = useState("");

    const handleCreate = async () => {
        if (!setName.trim()) {
            setMessage(t("studySet.requiredSetName"));
            return;
        }

        const newSet = await onCreate(setName);
        setSetName("");
        setMessage("");
        router.push(`/study-set/${newSet._id}`);
    };

    return (
        <Card className="space-y-4 p-5">
            <h1 className="text-2xl font-bold leading-tight text-[var(--color-text)] sm:text-3xl">{t("studySet.title")}</h1>

            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text)]">{t("studySet.setName")}</label>
                <input
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder={t("studySet.setNamePlaceholder")}
                    className="form-control"
                />
            </div>

            <Button onClick={handleCreate} className="inline-flex gap-2">
                <BookCopy className="h-4 w-4" />
                {t("studySet.createSet")}
            </Button>

            {message && <p className="text-sm font-medium text-[var(--color-primary)]">{message}</p>}
        </Card>
    );
}

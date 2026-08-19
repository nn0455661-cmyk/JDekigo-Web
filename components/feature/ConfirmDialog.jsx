"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onClose,
    tone = "danger",
}) {
    const { t } = useLanguage();
    const effectiveConfirmLabel = confirmLabel || t("common.confirm");
    const effectiveCancelLabel = cancelLabel || t("common.cancel");

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose?.();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, open]);

    if (!open) {
        return null;
    }

    const accentClass = tone === "danger"
        ? "bg-[rgba(255,107,0,0.1)] text-[var(--color-primary)]"
        : "bg-[rgba(79,102,173,0.1)] text-[#44548b]";
    const confirmClass = tone === "danger"
        ? "bg-[var(--color-primary)] text-white"
        : "bg-[#44548b] text-white";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                    <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentClass}`}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-xl font-black text-[var(--color-text)]">{title}</h3>
                                {description ? <p className="mt-1 text-sm text-[var(--color-text-soft)]">{description}</p> : null}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                                aria-label={t("common.close")}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]"
                    >
                        {effectiveCancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${confirmClass}`}
                    >
                        {effectiveConfirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

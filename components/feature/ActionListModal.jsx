import Link from "next/link";
import { FileText, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export default function ActionListModal({
    open,
    title,
    subtitle,
    onClose,
    items = [],
    emptyText,
    cancelLabel,
}) {
    const { t } = useLanguage();

    if (!open) {
        return null;
    }

    const resolvedEmptyText = emptyText || t("common.noData", "Chua co du lieu.");
    const resolvedCancelLabel = cancelLabel || t("common.cancel", "Huy");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3">
                    <div>
                        <p className="text-lg font-bold text-[var(--color-text)]">{title}</p>
                        {subtitle ? <p className="text-sm text-[var(--color-text-soft)]">{subtitle}</p> : null}
                    </div>

                    <button
                        type="button"
                        aria-label={t("common.close", "Dong")}
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
                    {items.length === 0 ? (
                        <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm text-[var(--color-text-soft)]">
                            {resolvedEmptyText}
                        </p>
                    ) : (
                        items.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={onClose}
                                className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:bg-[var(--color-bg-soft)]"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                                        <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                        <span className="truncate">{item.title}</span>
                                    </p>
                                    {item.meta ? (
                                        <span className="shrink-0 text-xs font-semibold text-[var(--color-text-soft)]">{item.meta}</span>
                                    ) : null}
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <div className="flex justify-end border-t border-[var(--color-border)] px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-soft)]"
                    >
                        {resolvedCancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
"use client";

import { LoaderCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export function LoadingState({ message, rows = 3, compact = false, className = "" }) {
    const { t } = useLanguage();
    const displayMessage = message || t("common.loadingData");

    return (
        <div className={`loading-state ${compact ? "loading-state-compact" : ""} ${className}`}>
            <div className="loading-state-icon" aria-hidden="true">
                <LoaderCircle className="h-5 w-5 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="loading-state-text">{displayMessage}</p>
                <div className="loading-skeleton-stack" aria-hidden="true">
                    {Array.from({ length: rows }).map((_, index) => (
                        <span key={index} className={`loading-skeleton-line loading-skeleton-line-${index + 1}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function InlineLoading({ message, className = "" }) {
    const { t } = useLanguage();
    const displayMessage = message || t("common.loading");

    return (
        <span className={`inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-soft)] ${className}`}>
            <LoaderCircle className="h-4 w-4 animate-spin text-[var(--color-primary)]" aria-hidden="true" />
            {displayMessage}
        </span>
    );
}

export function TableLoadingRow({ colSpan, message }) {
    return (
        <tr>
            <td colSpan={colSpan}>
                <LoadingState message={message} rows={2} compact />
            </td>
        </tr>
    );
}

export default LoadingState;

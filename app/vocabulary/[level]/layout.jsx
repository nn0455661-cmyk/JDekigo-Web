"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import RequireAuth from "@/components/auth/RequireAuth";

export default function VocabularyLevelLayout({ children }) {
    const segment = useSelectedLayoutSegment();

    if (!segment) {
        return children;
    }

    return <RequireAuth>{children}</RequireAuth>;
}

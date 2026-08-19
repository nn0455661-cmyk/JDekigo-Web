"use client";

import RequireAuth from "@/components/auth/RequireAuth";

export default function StudySetDetailLayout({ children }) {
    return <RequireAuth>{children}</RequireAuth>;
}

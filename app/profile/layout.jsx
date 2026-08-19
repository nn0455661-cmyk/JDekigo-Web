"use client";

import RequireAuth from "@/components/auth/RequireAuth";

export default function ProfileLayout({ children }) {
    return <RequireAuth>{children}</RequireAuth>;
}

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";

export default function ReadingTestRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const level = normalizeLevel(String(params?.level || DEFAULT_LEVEL).toUpperCase());

    useEffect(() => {
        router.replace(`/reading/${level}`);
    }, [level, router]);

    return (
        <section className="dashboard-shell p-4 sm:p-5">
            <p className="text-sm text-[var(--color-text-soft)]">Reading không có phần kiểm tra. Đang quay lại danh sách luyện đọc...</p>
        </section>
    );
}

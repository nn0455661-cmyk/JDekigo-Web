"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import notify from "@/src/lib/notifier";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

export default function RequireAuth({ children, message }) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();
    const { isReady, isAuthenticated } = useAuth();
    const notifiedRef = useRef(false);
    const notifyMessage = message || t("auth.loginRequiredMessage", "Vui lòng đăng nhập để học và làm bài.");

    useEffect(() => {
        if (!isReady || isAuthenticated || notifiedRef.current) {
            return;
        }

        notifiedRef.current = true;
        notify.info(notifyMessage, {
            className: "auth-toast",
            bodyClassName: "auth-toast-body",
            progressClassName: "auth-toast-progress",
        });

        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set("from", pathname);

        window.requestAnimationFrame(() => {
            router.replace(loginUrl.toString());
        });
    }, [isAuthenticated, isReady, notifyMessage, pathname, router]);

    if (!isReady) {
        return null;
    }

    if (!isAuthenticated) {
        return null;
    }

    return children;
}
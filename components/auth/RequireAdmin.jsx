"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import notify from "@/src/lib/notifier";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

function decodeBase64Url(input) {
    const base64 = String(input).replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return atob(padded);
}

function getTokenPayload(token) {
    if (!token) {
        return null;
    }

    try {
        const payloadPart = token.split(".")[1];
        if (!payloadPart) {
            return null;
        }

        return JSON.parse(decodeBase64Url(payloadPart));
    } catch {
        return null;
    }
}

function readJson(value) {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function getCachedSession() {
    if (typeof window === "undefined") {
        return { cachedUser: null, cachedToken: "" };
    }

    return {
        cachedUser: readJson(window.localStorage.getItem("jlearn_user")),
        cachedToken: window.localStorage.getItem("jlearn_access_token") || "",
    };
}

export default function RequireAdmin({ children, loginMessage, forbiddenMessage }) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();
    const { isReady, isAuthenticated, user, accessToken } = useAuth();
    const notifiedRef = useRef(false);

    const { cachedUser, cachedToken } = useMemo(() => getCachedSession(), []);

    const tokenRole = String(getTokenPayload(accessToken || cachedToken)?.role || "").toLowerCase();
    const role = String(user?.role || cachedUser?.role || tokenRole || "").toLowerCase();
    const isAdmin = role === "admin";
    const hasSession = isAuthenticated || Boolean(accessToken || cachedToken || cachedUser);

    const notifyLoginMessage =
        loginMessage || t("auth.loginRequiredMessage", "Vui long dang nhap de vao trang quan tri.");
    const notifyForbiddenMessage =
        forbiddenMessage || t("auth.adminRequiredMessage", "Tai khoan cua ban khong co quyen truy cap.");

    useEffect(() => {
        if (!isReady || notifiedRef.current) {
            return;
        }

        if (!hasSession) {
            notifiedRef.current = true;
            notify.info(notifyLoginMessage, {
                className: "auth-toast",
                bodyClassName: "auth-toast-body",
                progressClassName: "auth-toast-progress",
            });

            const loginUrl = new URL("/login", window.location.origin);
            loginUrl.searchParams.set("from", pathname);

            window.requestAnimationFrame(() => {
                router.replace(loginUrl.toString());
            });
            return;
        }

        if (!isAdmin) {
            notifiedRef.current = true;
            notify.error(null, notifyForbiddenMessage, {
                className: "auth-toast",
                bodyClassName: "auth-toast-body",
                progressClassName: "auth-toast-progress",
            });

            window.requestAnimationFrame(() => {
                router.replace("/");
            });
        }
    }, [hasSession, isAdmin, isReady, notifyForbiddenMessage, notifyLoginMessage, pathname, router]);

    if (!isReady) {
        return null;
    }

    if (!hasSession) {
        return null;
    }

    if (!isAdmin) {
        return null;
    }

    return children;
}

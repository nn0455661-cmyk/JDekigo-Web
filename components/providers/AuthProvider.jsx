"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "src/lib/axios";
import * as authService from "src/services/auth.service";
import { clearUserScopedClientState } from "@/src/lib/session-cleanup";

const AuthContext = createContext(null);
const USER_KEY = "jlearn_user";
const ACCESS_TOKEN_KEY = "jlearn_access_token";

let refreshPromise = null;

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

function getTokenExpiresAt(token) {
    const payload = getTokenPayload(token);

    if (!payload?.exp) {
        return 0;
    }

    return payload.exp * 1000;
}

export function AuthProvider({ children }) {
    const router = useRouter();
    const refreshTimerRef = useRef(null);
    const refreshSessionRef = useRef(null);
    const scheduleRefreshRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState("");

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const clearSession = useCallback(() => {
        clearRefreshTimer();
        setUser(null);
        setAccessToken("");
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem("access_token");
        clearUserScopedClientState();
    }, [clearRefreshTimer]);

    const scheduleRefresh = useCallback(
        (token) => {
            clearRefreshTimer();

            const expiresAt = getTokenExpiresAt(token);
            if (!expiresAt) {
                return;
            }

            const refreshAt = Math.max(expiresAt - 60_000, Date.now() + 5_000);
            const delay = refreshAt - Date.now();

            refreshTimerRef.current = setTimeout(() => {
                void refreshSessionRef.current?.().catch(() => {
                    clearSession();
                    router.push("/login");
                });
            }, delay);
        },
        [clearRefreshTimer, clearSession, router]
    );

    const refreshSession = useCallback(async () => {
        if (!refreshPromise) {
            refreshPromise = (async () => {
                const payload = await authService.refresh();
                // payload may be { data: { ... } } or already the data — normalize
                return payload?.data || payload;
            })().finally(() => {
                refreshPromise = null;
            });
        }

        const data = await refreshPromise;
        setUser(data.user);
        setAccessToken(data.accessToken || "");
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        if (data.accessToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            scheduleRefreshRef.current?.(data.accessToken);
        }

        return data;
    }, []);

    useEffect(() => {
        refreshSessionRef.current = refreshSession;
        scheduleRefreshRef.current = scheduleRefresh;
    }, [refreshSession, scheduleRefresh]);

    const setSession = useCallback(
        ({ nextUser, nextAccessToken }) => {
            clearUserScopedClientState();
            setUser(nextUser);
            setAccessToken(nextAccessToken || "");
            localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
            localStorage.removeItem("access_token");

            if (nextAccessToken) {
                localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
                scheduleRefresh(nextAccessToken);
            } else {
                localStorage.removeItem(ACCESS_TOKEN_KEY);
                clearRefreshTimer();
            }
        },
        [clearRefreshTimer, scheduleRefresh]
    );

    const updateUser = useCallback((nextUser) => {
        setUser(nextUser);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }, []);

    const ensureFreshSession = useCallback(
        async (minimumValidityMs = 60_000) => {
            if (!accessToken) {
                if (user) {
                    return refreshSession();
                }

                return null;
            }

            const expiresAt = getTokenExpiresAt(accessToken);
            if (!expiresAt || expiresAt - Date.now() <= minimumValidityMs) {
                return refreshSession();
            }

            return {
                user,
                accessToken,
            };
        },
        [accessToken, refreshSession, user]
    );

    const authFetch = useCallback(
        async (input, init = {}, options = {}) => {
            const { retryOnUnauthorized = true } = options;

            const freshSession = await ensureFreshSession();
            const requestToken = freshSession?.accessToken || accessToken;

            const method = (init.method || "GET").toLowerCase();
            const headers = {
                ...(init.headers || {}),
                ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
            };

            const config = {
                url: typeof input === "string" ? input : input.url || input,
                method,
                headers,
                data: init.body,
            };

            try {
                const axiosRes = await api(config);
                return { status: axiosRes.status, json: async () => axiosRes.data };
            } catch (err) {
                const status = err?.response?.status;
                if (status === 401 && retryOnUnauthorized) {
                    try {
                        const refreshed = await refreshSession();
                        if (!refreshed) {
                            clearSession();
                            router.push("/login");
                            throw err;
                        }

                        const retryConfig = {
                            ...config,
                            headers: { ...(config.headers || {}), Authorization: `Bearer ${refreshed.accessToken}` },
                        };

                        const retryRes = await api(retryConfig);
                        return { status: retryRes.status, json: async () => retryRes.data };
                    } catch (e) {
                        clearSession();
                        router.push("/login");
                        throw e;
                    }
                }

                throw err;
            }
        },
        [accessToken, clearSession, ensureFreshSession, refreshSession, router]
    );

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch {
            // ignore network failures
        } finally {
            clearSession();
            router.push("/login");
        }
    }, [clearSession, router]);

    useEffect(() => {
        const savedUser = readJson(localStorage.getItem(USER_KEY));
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY) || "";
        localStorage.removeItem("access_token");

        if (savedUser) {
            setUser(savedUser);
        }

        if (savedToken) {
            setAccessToken(savedToken);
            scheduleRefresh(savedToken);
        }

        setIsReady(true);

        return () => {
            clearRefreshTimer();
        };
    }, [clearRefreshTimer, scheduleRefresh]);

    const value = useMemo(
        () => ({
            isReady,
            user,
            accessToken,
            isAuthenticated: Boolean(user),
            setSession,
            updateUser,
            clearSession,
            refreshSession,
            ensureFreshSession,
            authFetch,
            logout,
        }),
        [accessToken, authFetch, clearSession, ensureFreshSession, isReady, logout, refreshSession, setSession, updateUser, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }

    return context;
}

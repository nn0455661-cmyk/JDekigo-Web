"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { prefetchContentStats } from "@/src/services/content-counts.service";
import { EXAM_LOCK_EVENT, EXAM_LOCK_STORAGE_KEY } from "@/src/services/exam-lock.service";
import { prefetchModuleData } from "@/src/services/prefetch.service";
import {
    BookOpen,
    Film,
    LogOut,
    GraduationCap,
    Home,
    Layers3,
    LogIn,
    Mic2,
    ScrollText,
    Timer,
    UserRound,
} from "lucide-react";

const navItems = [
    { href: "/", labelKey: "nav.home", icon: Home, kind: "icon", iconVar: "--icon-home" },
    { href: "/grammar", labelKey: "nav.grammar", icon: ScrollText, kind: "icon", iconVar: "--icon-grammar" },
    { href: "/vocabulary", labelKey: "nav.vocabulary", icon: BookOpen, kind: "icon", iconVar: "--icon-vocabulary" },
    { href: "/kanji", labelKey: "nav.kanji", kind: "text-kanji", iconVar: "--icon-kanji" },
    { href: "/mock-test", labelKey: "nav.mockTest", icon: Timer, kind: "icon", iconVar: "--icon-mocktest" },
    { href: "/video", labelKey: "nav.video", icon: Film, kind: "icon", iconVar: "--icon-video" },
    { href: "/speaking", labelKey: "nav.speaking", icon: Mic2, kind: "icon", iconVar: "--color-primary" },
    { href: "/study-set", labelKey: "nav.studySet", icon: Layers3, kind: "icon", iconVar: "--icon-studyset" },
];

const countModuleByHref = {
    "/grammar": "grammar",
    "/vocabulary": "vocabulary",
    "/kanji": "kanji",
    "/reading": "reading",
};

const languageOptions = [
    { code: "vi", label: "VI" },
    { code: "en", label: "EN" },
    { code: "ja", label: "JP" },
];

function isNavItemActive(pathname, href) {
    if (href === "/") {
        return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { language, setLanguage, t } = useLanguage();
    const { user, isAuthenticated, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState("light");
    const [isExamLocked, setIsExamLocked] = useState(false);
    const activeMobileLinkRef = useRef(null);

    useEffect(() => {
        const syncExamLock = (event) => {
            const path = pathname || "";
            const isTestRun = /^\/mock-test\/[^/]+\/test\/(?:run|[^/]+)$/.test(path)
                || /^\/(?:vocabulary|kanji|grammar)\/[^/]+\/test\/[^/]+$/.test(path);
            let lockedFromStorage = false;

            try {
                lockedFromStorage = sessionStorage.getItem(EXAM_LOCK_STORAGE_KEY) === "1";
            } catch {
                lockedFromStorage = false;
            }

            const lockedFromEvent = typeof event?.detail?.locked === "boolean" ? event.detail.locked : null;
            setIsExamLocked(isTestRun && (lockedFromEvent ?? lockedFromStorage));

            if (!isTestRun && lockedFromStorage) {
                try {
                    sessionStorage.removeItem(EXAM_LOCK_STORAGE_KEY);
                } catch {
                    // Ignore storage failures; the Navbar is already unlocked.
                }
            }
        };

        syncExamLock();
        window.addEventListener(EXAM_LOCK_EVENT, syncExamLock);
        window.addEventListener("storage", syncExamLock);

        return () => {
            window.removeEventListener(EXAM_LOCK_EVENT, syncExamLock);
            window.removeEventListener("storage", syncExamLock);
        };
    }, [pathname]);

    useEffect(() => {
        const savedTheme = localStorage.getItem("jlearn_theme") || "light";

        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const warmContentStats = () => {
            Object.values(countModuleByHref).forEach((moduleKey) => prefetchContentStats(moduleKey));
        };

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
            const idleId = window.requestIdleCallback(warmContentStats, { timeout: 2500 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = window.setTimeout(warmContentStats, 1200);
        return () => window.clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        if (!activeMobileLinkRef.current) {
            return;
        }

        activeMobileLinkRef.current.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
    }, [pathname]);

    const handleThemeToggle = () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setTheme(nextTheme);
        localStorage.setItem("jlearn_theme", nextTheme);
        document.documentElement.dataset.theme = nextTheme;
    };

    const prefetchNavItem = (href) => {
        if (isExamLocked) {
            return;
        }

        router.prefetch(href);
        prefetchModuleData(href);
        const moduleKey = countModuleByHref[href];
        if (moduleKey) {
            prefetchContentStats(moduleKey);
        }
    };

    const preventNavigationWhenLocked = (event) => {
        if (!isExamLocked) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
    };

    const renderAvatarMenu = (menuClassName, isSidebar = false) => (
        <div className={menuClassName}>
            <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--shadow-card)]"
                aria-label={t("nav.openProfileMenu", "Open profile menu")}
            >
                <UserRound className="h-5 w-5" />
            </button>

            {isMenuOpen && (
                <div
                    className={`absolute z-50 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)] ${isSidebar ? "left-14 bottom-0" : "right-0 top-12"
                        }`}
                >
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/profile"
                                onClick={preventNavigationWhenLocked}
                                aria-disabled={isExamLocked}
                                className={`block rounded-lg bg-[var(--color-bg-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] ${isExamLocked ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                                {t("nav.profile")}
                            </Link>
                        </>
                    ) : (
                        <div className="grid gap-2">
                            <Link
                                href="/login"
                                onClick={preventNavigationWhenLocked}
                                aria-disabled={isExamLocked}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white ${isExamLocked ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                                <LogIn className="h-4 w-4" />
                                {t("login.login")}
                            </Link>
                            <Link
                                href="/register"
                                onClick={preventNavigationWhenLocked}
                                aria-disabled={isExamLocked}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] ${isExamLocked ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                                {t("register.submit")}
                            </Link>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleThemeToggle}
                        className="mt-3 w-full rounded-lg bg-[var(--color-bg-soft)] px-3 py-2 text-left text-sm font-medium text-[var(--color-text)]"
                    >
                        {t("nav.theme")}: {theme === "light" ? t("nav.light") : t("nav.dark")}
                    </button>

                    <div className="mt-3">
                        <p className="mb-2 text-xs font-medium text-[var(--color-text-soft)]">{t("nav.language")}</p>
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-[var(--color-bg-soft)] p-1">
                            {languageOptions.map((option) => (
                                <button
                                    key={option.code}
                                    type="button"
                                    onClick={() => setLanguage(option.code)}
                                    className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${language === option.code
                                        ? "bg-[var(--color-primary)] text-white"
                                        : "text-[var(--color-text-soft)]"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isAuthenticated ? (
                        <button
                            type="button"
                            onClick={isExamLocked ? undefined : logout}
                            disabled={isExamLocked}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(255,107,0,0.2)] bg-[rgba(255,107,0,0.08)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <LogOut className="h-4 w-4" />
                            {t("nav.logout")}
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
    return (
        <>
            <header className="fixed left-0 top-0 z-40 hidden h-screen w-28 p-4 md:block">
                <div className="flex h-full flex-col items-center rounded-3xl bg-[var(--color-bg-soft)] px-2.5 py-4 shadow-[var(--shadow-soft)]">
                    <Link
                        href="/"
                        aria-label={t("nav.goHome", "Go to home")}
                        onClick={preventNavigationWhenLocked}
                        aria-disabled={isExamLocked}
                        className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-lg font-bold text-white ${isExamLocked ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                        J
                    </Link>

                    <div className="nav-scrollbar-hidden flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto pr-1">
                        {navItems.map((item) => {
                            const isActive = isNavItemActive(pathname, item.href);
                            const Icon = item.icon;
                            const colorVal = isActive ? "white" : item.iconVar ? `var(${item.iconVar})` : undefined;
                            const iconStyle = colorVal ? { color: colorVal, stroke: colorVal } : undefined;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-label={t(item.labelKey)}
                                    aria-disabled={isExamLocked}
                                    onClick={preventNavigationWhenLocked}
                                    onMouseEnter={() => prefetchNavItem(item.href)}
                                    onFocus={() => prefetchNavItem(item.href)}
                                    className={`inline-flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl px-1 text-center text-[9px] font-medium leading-none transition md:text-[10px] ${isExamLocked && !isActive ? "cursor-not-allowed opacity-45" : ""} ${isActive
                                        ? "nav-active bg-[var(--color-primary)] text-white shadow-[0_8px_16px_rgba(255,107,0,0.3)]"
                                        : "bg-[var(--color-surface)] text-[var(--color-text-soft)] hover:text-[var(--color-primary)]"
                                        }`}
                                >
                                    {item.kind === "text-kanji" ? (
                                        <span className="flex h-5 w-5 items-center justify-center text-lg font-bold leading-none translate-y-px" style={iconStyle}>漢</span>
                                    ) : (
                                        <Icon className="h-4.5 w-4.5" style={iconStyle} />
                                    )}
                                    <span className="max-w-full truncate text-center">{t(item.labelKey)}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {renderAvatarMenu("relative", true)}
                </div>
            </header>

            <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur-xl md:hidden">
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        onClick={preventNavigationWhenLocked}
                        aria-disabled={isExamLocked}
                        className={`flex items-center gap-2 ${isExamLocked ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                        <span className="rounded-lg bg-[var(--color-primary)] px-2 py-1 text-xs font-bold text-white">J</span>
                        <span className="text-base font-bold tracking-tight text-[var(--color-text)]">J-Deki Go</span>
                    </Link>

                    {renderAvatarMenu("relative", false)}
                </div>

                <div className="nav-scrollbar-hidden -mx-4 mt-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [touch-action:pan-x]">
                    <div className="flex w-max min-w-full flex-nowrap gap-2">
                        {navItems.map((item) => {
                            const isActive = isNavItemActive(pathname, item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    ref={isActive ? activeMobileLinkRef : undefined}
                                    aria-disabled={isExamLocked}
                                    onClick={preventNavigationWhenLocked}
                                    onTouchStart={() => prefetchNavItem(item.href)}
                                    onMouseEnter={() => prefetchNavItem(item.href)}
                                    onFocus={() => prefetchNavItem(item.href)}
                                    className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium ${isExamLocked && !isActive ? "cursor-not-allowed opacity-45" : ""} ${isActive
                                        ? "bg-[var(--color-primary)] text-white"
                                        : "bg-[var(--color-surface)] text-[var(--color-text-soft)]"
                                        }`}
                                >
                                    {t(item.labelKey)}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>
        </>
    );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "@/constants/translations";

const LanguageContext = createContext(null);

function readByPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState("vi");

    useEffect(() => {
        const saved = localStorage.getItem("jlearn_language") || "vi";
        setLanguage(saved);
        document.documentElement.lang = saved;
    }, []);

    const changeLanguage = useCallback((nextLanguage) => {
        setLanguage(nextLanguage);
        localStorage.setItem("jlearn_language", nextLanguage);
        document.documentElement.lang = nextLanguage;
    }, []);

    const t = useCallback((key, fallback = "") => {
        return (
            readByPath(translations[language], key) ||
            readByPath(translations.vi, key) ||
            fallback ||
            key
        );
    }, [language]);

    const value = useMemo(
        () => ({ language, setLanguage: changeLanguage, t }),
        [language, changeLanguage, t]
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
}

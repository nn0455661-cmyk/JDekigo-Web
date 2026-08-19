"use client";

import { useEffect, useState } from "react";
import { ToastContainer, Slide } from "react-toastify";

export default function ToastProvider() {
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        const syncTheme = () => {
            const nextTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
            setTheme(nextTheme);
        };

        syncTheme();

        const observer = new MutationObserver(syncTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        window.addEventListener("storage", syncTheme);

        return () => {
            observer.disconnect();
            window.removeEventListener("storage", syncTheme);
        };
    }, []);

    return (
        <ToastContainer
            position="top-right"
            autoClose={2600}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover={false}
            draggable={false}
            pauseOnFocusLoss={false}
            transition={Slide}
            limit={3}
            theme={theme}
            toastClassName="auth-toast-shell"
            bodyClassName="auth-toast-body"
            progressClassName="auth-toast-progress"
        />
    );
}
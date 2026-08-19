import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import ToastProvider from "@/components/providers/ToastProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
    title: "J-Deki Go",
    description: "Japanese learning platform powered by MongoDB and real API data.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <body suppressHydrationWarning className="min-h-screen text-[var(--color-text)] antialiased">
                <AuthProvider>
                    <LanguageProvider>
                        <ToastProvider />
                        <AppShell>{children}</AppShell>
                    </LanguageProvider>
                </AuthProvider>
                <SpeedInsights />
            </body>
        </html>
    );
}

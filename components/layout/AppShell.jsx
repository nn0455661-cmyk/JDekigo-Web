"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageTransition from "@/components/layout/PageTransition";

export default function AppShell({ children }) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith("/admin");

    if (isAdminRoute) {
        return (
            <main className="w-full">
                {children}
            </main>
        );
    }

    return (
        <>
            <Navbar />
            <div className="md:pl-28">
                <main className="w-full px-3 py-4 sm:px-4 md:px-6 lg:px-8 xl:px-10">
                    <PageTransition>{children}</PageTransition>
                </main>
            </div>
        </>
    );
}

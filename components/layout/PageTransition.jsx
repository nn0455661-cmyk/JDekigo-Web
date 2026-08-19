"use client";

import { usePathname } from "next/navigation";

export default function PageTransition({ children }) {
    const pathname = usePathname();
    const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

    return (
        <div key={pathname} className={isAuthRoute ? "page-transition page-transition-auth" : "page-transition"}>
            {children}
        </div>
    );
}

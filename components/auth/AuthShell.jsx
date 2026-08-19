"use client";

import { Sparkles } from "lucide-react";

export default function AuthShell({
    title,
    subtitle,
    children,
}) {
    return (
        <section className="auth-shell mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl gap-4 p-3 sm:p-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-0 lg:p-5">
            <aside className="auth-panel relative z-20 overflow-hidden rounded-[28px] p-5 text-white shadow-[0_26px_64px_rgba(255,107,0,0.20),0_10px_24px_rgba(0,0,0,0.10)] sm:p-6 lg:mr-[-18px] lg:shadow-[0_34px_82px_rgba(255,107,0,0.24),0_16px_36px_rgba(0,0,0,0.14)] lg:p-8 xl:mr-[-26px]">
                <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/videos/v2.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,107,0,0.55),rgba(255,132,38,0.3)_40%,rgba(0,0,0,0.15))]" />
                <div className="auth-orb auth-orb-a" />
                <div className="auth-orb auth-orb-b" />

                <div className="relative z-10 flex h-full items-start justify-start">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/18 px-4 py-1.5 text-xs font-semibold tracking-[0.12em] backdrop-blur-md shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        J-Deki Go
                    </p>
                </div>
            </aside>

            <article className="surface-card auth-form-card relative z-10 flex items-center justify-center rounded-[28px] p-4 sm:p-6 lg:-ml-2 lg:pl-12 lg:pr-8 lg:shadow-[0_28px_70px_rgba(47,42,36,0.12),0_12px_24px_rgba(255,107,0,0.08)] lg:py-8 xl:-ml-4 xl:pl-14">
                <div className="w-full max-w-md">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">{subtitle}</p>
                        <h2 className="mt-2 text-3xl font-black text-[var(--color-text)]">{title}</h2>
                    </div>
                    <div className="mt-6">{children}</div>
                </div>
            </article>
        </section>
    );
}

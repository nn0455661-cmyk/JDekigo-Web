"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import { UserPlus2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import AuthShell from "@/components/auth/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import AuthInput from "@/components/auth/AuthInput";
import * as authService from "src/services/auth.service";

export default function LoginClient() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setSession, clearSession } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await authService.login({ email, password });

            if (!result || result?.success === false) {
                setError(result?.error?.message || result?.error || t("login.failed"));
                return;
            }

            clearSession();
            setSession({
                nextUser: result.data.user,
                nextAccessToken: result.data.accessToken,
            });

            const fromParam = searchParams.get("from");
            const roleValue = String(result?.data?.user?.role || "").toLowerCase();
            const fallbackPath = roleValue === "admin" ? "/admin" : "/";
            const nextPath = fromParam && fromParam.startsWith("/") ? fromParam : fallbackPath;
            router.push(nextPath);
        } catch (error) {
            const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
            setError(apiMessage || t("login.connectError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={t("login.title")}
            subtitle="Đăng nhập"
            heroTitle="Quay lại lộ trình học của bạn chỉ trong vài giây"
            heroDescription="Đăng nhập để đồng bộ tiến độ học, study set và lịch sử làm bài qua MongoDB backend mới."
            highlights={[
                { title: "Access token", description: "Được cấp sau đăng nhập và dùng cho các request bảo vệ." },
                { title: "Refresh token", description: "Lưu trong httpOnly cookie để tự động gia hạn." },
                { title: "Lịch sử", description: "Giữ lại kết quả học và kiểm tra theo level." },
                { title: "Chuyển mượt", description: "Login và register có hiệu ứng chuyển trang nhẹ." },
            ]}
            switchLabel={t("login.switchToRegister", "Tạo tài khoản mới")}
            switchHref="/register"
            switchHint="Chưa có tài khoản? Tạo ngay để bắt đầu lưu tiến độ học."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                    id="email"
                    label={t("login.email")}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                />

                <AuthInput
                    id="password"
                    label={t("login.password")}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("login.passwordPlaceholder", "Nhập mật khẩu")}
                    required
                />

                {error && <p className="rounded-xl border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.10)] px-3 py-2 text-sm text-[#f00606]">{error}</p>}

                <div className="flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-soft)]">
                        <input type="checkbox" className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-focus-ring)]" />
                        {t("login.rememberMe", "Ghi nhớ đăng nhập")}
                    </label>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_10px_28px_rgba(255,107,0,0.08)]">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
                        {t("login.actionPrompt", "Bạn đã có tài khoản chưa?")}
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? t("login.loggingIn") : t("login.login")}
                        </Button>
                        <Link
                            href="/register"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(255,107,0,0.18)] bg-[var(--color-surface)] px-4 py-2.5 font-semibold text-[var(--color-primary)] shadow-[0_8px_18px_rgba(255,107,0,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,107,0,0.3)] hover:bg-[var(--color-bg-soft)]"
                        >
                            <UserPlus2 className="h-4 w-4" />
                            {t("register.submit", "Tạo tài khoản")}
                        </Link>
                    </div>
                </div>
            </form>
        </AuthShell>
    );
}
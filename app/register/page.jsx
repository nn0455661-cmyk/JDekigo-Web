"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import AuthShell from "@/components/auth/AuthShell";
import Button from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import AuthInput from "@/components/auth/AuthInput";
import * as authService from "src/services/auth.service";

export default function RegisterPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { setSession } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await authService.register({ name, email, password, confirmPassword });

            if (!result || result?.success === false) {
                setError(result?.error?.message || result?.error || t("register.failed", "Đăng ký thất bại"));
                return;
            }

            setSession({
                nextUser: result.data.user,
                nextAccessToken: result.data.accessToken,
            });

            router.push("/");
        } catch {
            setError(t("register.connectError", "Không thể kết nối đến máy chủ"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={t("register.title", "Tạo tài khoản")}
            subtitle="Đăng ký"
            heroTitle="Tạo tài khoản để lưu tiến độ học, lịch sử và bộ thẻ cá nhân"
            heroDescription="Đăng ký một lần để đồng bộ học liệu, lưu trạng thái làm bài và dùng toàn bộ luồng học trên nền backend MongoDB mới."
            highlights={[
                { title: "Luồng học", description: "Học, làm bài và lưu history theo từng level." },
                { title: "Tài khoản", description: "Đăng nhập bằng JWT access token và refresh cookie." },
                { title: "Cá nhân hóa", description: "Study set và hồ sơ được lưu riêng cho user." },
                { title: "Mượt mà", description: "Chuyển giữa login và register có animation." },
            ]}
            switchLabel={t("register.switchToLogin", "Đã có tài khoản? Đăng nhập")}
            switchHref="/login"
            switchHint="Bạn có thể chuyển sang đăng nhập mà không bị gián đoạn trải nghiệm."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                    id="name"
                    label={t("register.name", "Họ và tên")}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("register.namePlaceholder", "Nhập họ và tên")}
                    required
                />

                <AuthInput
                    id="email"
                    label={t("register.email", "Email")}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                />

                <AuthInput
                    id="password"
                    label={t("register.password", "Mật khẩu")}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t("register.passwordPlaceholder", "Ít nhất 8 ký tự")}
                    required
                />

                <AuthInput
                    id="confirmPassword"
                    label={t("register.confirmPassword", "Xác nhận mật khẩu")}
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t("register.confirmPasswordPlaceholder", "Nhập lại mật khẩu")}
                    required
                />

                {error ? <p className="rounded-xl border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.10)] px-3 py-2 text-sm text-[#fecaca]">{error}</p> : null}

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_10px_28px_rgba(255,107,0,0.08)]">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
                        {t("register.actionPrompt", "Bạn đã có tài khoản chưa?")}
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button type="submit" className="flex-1" disabled={loading}>
                            {loading ? t("register.registering", "Đang tạo tài khoản...") : t("register.submit", "Đăng ký")}
                        </Button>

                        <button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[rgba(255,107,0,0.18)] bg-[var(--color-surface)] px-4 py-2.5 font-semibold text-[var(--color-text)] shadow-[0_8px_18px_rgba(255,107,0,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,107,0,0.3)] hover:bg-[var(--color-bg-soft)]"
                        >
                            <LogIn className="h-4 w-4" />
                            {t("register.switchToLogin", "Quay lại đăng nhập")}
                        </button>
                    </div>
                </div>
            </form>
        </AuthShell>
    );
}

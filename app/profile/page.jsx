"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import LoadingState from "@/components/LoadingState";
import {
    CalendarDays,
    Edit3,
    Eye,
    EyeOff,
    Lock,
    Mail,
    PencilLine,
    Phone,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import * as userService from "src/services/user.service";

const EMPTY_FORM = {
    name: "",
    email: "",
    phone: "",
    gender: "",
    avatar: "",
};

export default function ProfilePage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { isReady, user: sessionUser, accessToken, updateUser, authFetch, clearSession } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [infoForm, setInfoForm] = useState(EMPTY_FORM);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const loadedProfileRef = useRef(false);

    useEffect(() => {
        if (!message.text) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setMessage({ type: "", text: "" });
        }, 3000);

        return () => clearTimeout(timer);
    }, [message.text]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (loadedProfileRef.current) {
            return;
        }

        loadedProfileRef.current = true;

        const loadProfile = async () => {
            setLoading(true);

            try {
                const result = await userService.getMe();
                const nextUser = result?.data?.user || null;
                setUser(nextUser);
                updateUser(nextUser);
            } catch (err) {
                const status = err?.response?.status;

                if (status === 401) {
                    clearSession();
                    router.push("/login");
                    return;
                }

                setMessage({ type: "error", text: t("profile.loadError", "Không thể tải thông tin cá nhân.") });
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [clearSession, isReady, router, authFetch, updateUser, t]);

    const profile = useMemo(
        () => ({
            ...EMPTY_FORM,
            ...sessionUser,
            ...user,
            completedMocks: user?.completedMocks ?? sessionUser?.completedMocks ?? 0,
            completedLessons: user?.completedLessons ?? sessionUser?.completedLessons ?? 0,
            studyStreak: user?.studyStreak ?? sessionUser?.studyStreak ?? 0,
            accuracy: user?.accuracy ?? sessionUser?.accuracy ?? 0,
            createdAt: user?.createdAt ?? sessionUser?.createdAt ?? new Date().toISOString(),
            role: user?.role ?? sessionUser?.role ?? "user",
            status: t("profile.studying", "Đang học JPD113"),
        }),
        [sessionUser, t, user]
    );

    useEffect(() => {
        setInfoForm({
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            gender: profile.gender,
            avatar: profile.avatar,
        });
    }, [profile.avatar, profile.email, profile.gender, profile.name, profile.phone]);

    const avatarInitial = String(infoForm.name || infoForm.email || "J")
        .trim()
        .charAt(0)
        .toUpperCase();

    const saveProfile = async () => {
        setSavingProfile(true);

        try {
            const result = await userService.updateMe({
                name: infoForm.name,
                phone: infoForm.phone,
                gender: infoForm.gender,
                avatar: infoForm.avatar,
            });

            const nextUser = result?.data?.user || null;
            setUser(nextUser);
            updateUser(nextUser);
            setMessage({ type: "success", text: t("profile.saveSuccess", "Đã lưu thông tin cá nhân.") });
        } catch (err) {
            const status = err?.response?.status;

            if (status === 401) {
                clearSession();
                router.push("/login");
                return;
            }

            setMessage({ type: "error", text: t("profile.saveError", "Không thể lưu thông tin cá nhân.") });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async () => {
        if (!passwordForm.currentPassword || !passwordForm.nextPassword || !passwordForm.confirmPassword) {
            setMessage({ type: "error", text: t("profile.missingPasswordError", "Vui lòng nhập đầy đủ mật khẩu cũ, mật khẩu mới và xác nhận.") });
            return;
        }

        if (passwordForm.nextPassword.length < 8) {
            setMessage({ type: "error", text: t("profile.passwordLengthError", "Mật khẩu mới phải có ít nhất 8 ký tự.") });
            return;
        }

        if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
            setMessage({ type: "error", text: t("profile.passwordMatchError", "Mật khẩu xác nhận không khớp.") });
            return;
        }

        setSavingPassword(true);

        try {
            await userService.changePassword(passwordForm);
            setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
            setMessage({ type: "success", text: t("profile.changePasswordSuccess", "Đã đổi mật khẩu thành công.") });
        } catch (err) {
            const status = err?.response?.status;

            if (status === 401) {
                clearSession();
                router.push("/login");
                return;
            }

            setMessage({ type: "error", text: t("profile.changePasswordError", "Không thể đổi mật khẩu.") });
        } finally {
            setSavingPassword(false);
        }
    };

    if (!isReady || loading) {
        return (
            <section className="dashboard-shell mx-auto max-w-7xl p-4 sm:p-5">
                <LoadingState message={t("profile.loadingProfile", "Đang tải hồ sơ từ máy chủ...")} />
            </section>
        );
    }

    const joinedAt = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "-";

    return (
        <section className="dashboard-shell mx-auto max-w-7xl overflow-hidden p-3 sm:p-4">
            <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-primary)]">
                    <UserRound className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="section-title">{t("profile.title")}</h1>
                    <p className="text-sm text-[var(--color-text-soft)]">{t("profile.profileOverview", "Tổng quan hồ sơ")}</p>
                </div>
            </div>

            {message.text ? (
                <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {message.text}
                </div>
            ) : null}

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
                <div className="space-y-3">
                    <Card className="overflow-hidden p-0">
                        <div className="relative p-4 sm:p-5">
                            <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-[rgba(255,120,0,0.08)] blur-3xl" />
                            <div className="relative flex items-center gap-4">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-2xl font-black text-white shadow-[0_12px_24px_rgba(255,120,0,0.16)]">
                                    {avatarInitial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                                        {t("profile.accountTitle", "Tài khoản học tập")}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2">
                                        <input
                                            value={infoForm.name}
                                            onChange={(event) => setInfoForm((prev) => ({ ...prev, name: event.target.value }))}
                                            className="w-full bg-transparent text-xl font-black text-[var(--color-text)] outline-none sm:text-2xl"
                                        />
                                        <PencilLine className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                                    {t("profile.changePassword", "Đổi mật khẩu")}
                                </p>
                                <h3 className="mt-1 text-base font-black text-[var(--color-text)]">{t("profile.securityTitle", "Bảo mật tài khoản")}</h3>
                            </div>
                            <button type="button" onClick={savePassword} disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-70">
                                <Lock className="h-4 w-4" />
                                {savingPassword ? t("profile.changingPassword", "Đang đổi...") : t("profile.changePassword", "Đổi mật khẩu")}
                            </button>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {[
                                { key: "currentPassword", label: t("profile.currentPassword", "Mật khẩu cũ") },
                                { key: "nextPassword", label: t("profile.nextPassword", "Mật khẩu mới") },
                                { key: "confirmPassword", label: t("profile.confirmPassword", "Nhập lại mật khẩu") },
                            ].map((field) => (
                                <div key={field.key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-soft)]">{field.label}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={passwordForm[field.key]}
                                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                                            className="w-full bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none"
                                            placeholder={field.label}
                                        />
                                        <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-[var(--color-text-soft)] transition hover:text-[var(--color-text)]" aria-label={t("profile.togglePasswordVisibility", "Hiện hoặc ẩn mật khẩu")}>
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5 text-sm text-[var(--color-text-soft)]">
                            <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                            {t("profile.passwordRequirement", "Mật khẩu mới phải tối thiểu 8 ký tự.")}
                        </div>
                    </Card>
                </div>

                <Card className="p-4">
                    <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={saveProfile} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-70">
                            <Edit3 className="h-4 w-4" />
                            {savingProfile ? t("profile.saving", "Đang lưu...") : t("profile.saveProfile", "Lưu thông tin")}
                        </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                        {[
                            { label: t("profile.email", "Email"), key: "email", icon: Mail, type: "email", readOnly: true },
                            { label: t("profile.phone", "Số điện thoại"), key: "phone", icon: Phone, type: "tel" },
                            { label: t("profile.gender", "Giới tính"), key: "gender", icon: UserRound, type: "text" },
                        ].map((row) => {
                            const Icon = row.icon;

                            return (
                                <label key={row.key} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-primary)]">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-soft)]">{row.label}</p>
                                        <input
                                            type={row.type}
                                            value={infoForm[row.key]}
                                            readOnly={row.readOnly}
                                            onChange={(event) => setInfoForm((prev) => ({ ...prev, [row.key]: event.target.value }))}
                                            className={`mt-1 w-full bg-transparent text-sm font-semibold text-[var(--color-text)] outline-none ${row.readOnly ? "cursor-not-allowed opacity-75" : ""}`}
                                        />
                                    </div>
                                </label>
                            );
                        })}

                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2.5">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-primary)]">
                                <CalendarDays className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-soft)]">{t("profile.joinedAt", "Tham gia từ")}</p>
                                <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{joinedAt}</p>
                            </div>
                        </div>
                    </div>

                </Card>
            </div>
        </section>
    );
}

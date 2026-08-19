"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Clock3, Film, Layers3, Mic2, Route, ScrollText, Timer, BarChart2, ClipboardList, ClipboardCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHeroImages } from "@/hooks/useHeroImages";
import { useLanguage } from "@/hooks/useLanguage";
import { useStudySets } from "@/hooks/useStudySets";
import LoadingState from "@/components/LoadingState";

const HERO_IMAGE_KEY = "jlearn_home_hero_image";

export default function HomePage() {
    const { t } = useLanguage();
    const { isReady: authReady, user } = useAuth();
    const { studySets, isReady: isStudySetsReady } = useStudySets();
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const { heroImageOptions, defaultHeroImage, isHeroImagesLoaded } = useHeroImages();
    const [heroImage, setHeroImage] = useState(defaultHeroImage);
    const [isHeroImageHydrated, setIsHeroImageHydrated] = useState(false);

    useEffect(() => {
        const savedImage = localStorage.getItem(HERO_IMAGE_KEY);

        if (savedImage) {
            setHeroImage(savedImage);
        }

        setIsHeroImageHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHeroImageHydrated) {
            return;
        }

        localStorage.setItem(HERO_IMAGE_KEY, heroImage);
    }, [heroImage, isHeroImageHydrated]);

    useEffect(() => {
        if (!isHeroImageHydrated || !isHeroImagesLoaded) {
            return;
        }

        setHeroImage((current) => (heroImageOptions.includes(current) ? current : heroImageOptions[0] || defaultHeroImage));
    }, [defaultHeroImage, heroImageOptions, isHeroImageHydrated, isHeroImagesLoaded]);

    const modules = [
        {
            icon: ScrollText,
            title: t("nav.grammar"),
            href: "/grammar",
            summary: t("home.featureGrammarDesc"),
            tag: t("nav.grammar"),
            iconVar: "--icon-grammar",
            iconBgVar: "--icon-grammar-bg",
            cardBgVar: "--module-grammar-bg",
        },
        {
            icon: BookOpen,
            title: t("nav.vocabulary"),
            href: "/vocabulary",
            summary: t("home.featureVocabularyDesc"),
            tag: t("nav.vocabulary"),
            iconVar: "--icon-vocabulary",
            iconBgVar: "--icon-vocabulary-bg",
            cardBgVar: "--module-vocabulary-bg",
        },
        {
            kind: "text-kanji",
            title: t("nav.kanji"),
            href: "/kanji",
            summary: t("home.featureKanjiDesc"),
            tag: t("nav.kanji"),
            iconVar: "--icon-kanji",
            iconBgVar: "--icon-kanji-bg",
            cardBgVar: "--module-kanji-bg",
        },
        // {
        //     icon: Timer,
        //     title: t("nav.mockTest"),
        //     href: "/mock-test",
        //     summary: t("home.featureMockTestDesc"),
        //     tag: t("nav.mockTest"),
        //     iconVar: "--icon-mocktest",
        //     iconBgVar: "--icon-mocktest-bg",
        //     cardBgVar: "--module-mocktest-bg",
        // },
        {
            icon: Film,
            title: t("nav.video", "Video"),
            href: "/video",
            summary: t("home.videoDesc", "Củng cố kiến thức qua video ngắn."),
            tag: t("nav.video", "Video"),
            iconVar: "--icon-video",
            iconBgVar: "--icon-video-bg",
            cardBgVar: "--module-video-bg",
        },
        {
            icon: Mic2,
            title: t("nav.speaking", "Speaking"),
            href: "/speaking",
            summary: t("home.speakingDesc", "Luyện phản xạ giao tiếp với audio, kịch bản hội thoại và đoạn văn theo chủ đề."),
            tag: t("nav.speaking", "Speaking"),
            iconVar: "--icon-home",
            iconBgVar: "--icon-speaking-bg",
            cardBgVar: "--module-speaking-bg",
        },
        {
            icon: Layers3,
            title: t("nav.studySet"),
            href: "/study-set",
            summary: t("home.featureStudySetDesc"),
            tag: t("nav.studySet"),
            iconVar: "--icon-studyset",
            iconBgVar: "--icon-studyset-bg",
            cardBgVar: "--module-studyset-bg",
        },
    ];

    const recentStudySets = useMemo(
        () =>
            [...studySets]
                .filter((set) => Array.isArray(set.cards) && set.cards.length > 0)
                .sort((a, b) => {
                    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
                    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
                    return bTime - aTime;
                })
                .slice(0, 3),
        [studySets]
    );

    const focusActions = useMemo(
        () =>
            recentStudySets.map((set) => ({
                icon: Layers3,
                title: set.name,
                desc: `${set.cards.length} ${t("studySet.cardsCount", "thẻ")}`,
                href: `/study-set/${set._id}/flashcard`,
                color: "var(--icon-studyset)",
                tint: "rgba(255,244,198,0.54)",
                border: "rgba(201,200,0,0.28)",
                glow: "rgba(201,200,0,0.18)",
            })),
        [recentStudySets, t]
    );

    const isLoggedIn = Boolean(user);
    const displayName = user?.name || user?.email || t("home.you", "bạn");

    const openImagePicker = () => {
        setIsImagePickerOpen(true);
    };

    const closeImagePicker = () => {
        setIsImagePickerOpen(false);
    };

    const applyImagePath = (nextPath) => {
        if (!nextPath) {
            return;
        }

        setHeroImage(nextPath);
        localStorage.setItem(HERO_IMAGE_KEY, nextPath);
        setIsImagePickerOpen(false);
    };

    return (
        <section className="dashboard-shell grid min-h-[calc(100vh-2.5rem)] gap-2 overflow-visible p-2 lg:min-h-[calc(100dvh-6rem)] lg:p-3">
            <article className="relative overflow-hidden rounded-2xl p-3 text-white shadow-[0_20px_48px_rgba(0,0,0,0.2)] sm:p-4 lg:min-h-[clamp(210px,24vh,240px)]">
                <div className="absolute inset-0">
                    <Image src="/japan_street_sakura_banner.png" alt="Japanese Street Sakura Background" fill priority className="object-cover object-center" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/40 via-rose-400/20 to-transparent mix-blend-overlay" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.35)_50%,rgba(0,0,0,0.75)_100%)]" />
                </div>
                <div className="relative grid h-full gap-4 lg:grid-cols-[1fr_auto] lg:items-stretch">
                    <div className="flex flex-col gap-4 lg:h-full lg:justify-between lg:pr-4">
                        <div>
                            <p className="inline-block -mt-1 rounded-[8px] bg-[#ff7a00] px-2.5 py-1 text-[11px] font-black tracking-widest text-white uppercase shadow-sm mb-1">J-DEKI GO</p>
                            <h1 className="mt-0.5 text-[clamp(24px,4vw,32px)] font-black leading-tight tracking-tight text-white drop-shadow-md max-w-2xl">
                                {authReady && isLoggedIn ? `${t("home.hello", "Xin chào")} ${displayName}` : t("home.heroTitle", "Nền tảng học tiếng Nhật theo lộ trình rõ ràng")}
                            </h1>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <Link
                                href="/vocabulary/JPD113/intro"
                                className="group flex flex-col justify-between items-start gap-2 rounded-2xl border border-[rgba(2,132,199,0.18)] bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_58%,#eaf7fd_100%)] p-3 w-[135px] h-[90px] text-[#2f2a24] shadow-[0_8px_20px_rgba(47,42,36,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-2 hover:border-[#0284c7] hover:shadow-[0_0_0_3px_rgba(2,132,199,0.18),0_16px_34px_rgba(2,132,199,0.26),inset_0_1px_0_rgba(255,255,255,0.96)]"
                            >
                                <div className="flex w-full items-start justify-between">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#e0f2fe,#bae6fd)] text-[#0284c7] shadow-[0_6px_14px_rgba(47,42,36,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] transition group-hover:scale-110 group-hover:text-[#0284c7]">
                                        <span className="text-xl font-black leading-none translate-y-px">あ</span>
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-[#0284c7]/40 transition group-hover:translate-x-1 group-hover:text-[#0284c7]" />
                                </div>
                                <div className="mt-1 w-full text-left">
                                    <span className="block truncate text-[14px] font-black text-[#ff7a00] transition-colors group-hover:text-[#0284c7]">{t("home.alphabetTitle")}</span>
                                </div>
                            </Link>

                            <div className="w-[135px] h-[90px]">
                                {authReady && isLoggedIn ? (
                                    <Link
                                        href="/mock-test"
                                        className="group flex flex-col justify-between items-start gap-2 rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_58%,#fff0f0_100%)] p-3 w-full h-full text-[#2f2a24] shadow-[0_8px_20px_rgba(47,42,36,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-2 hover:border-[#dc2626] hover:shadow-[0_0_0_3px_rgba(220,38,38,0.18),0_16px_34px_rgba(220,38,38,0.26),inset_0_1px_0_rgba(255,255,255,0.96)]"
                                    >
                                        <div className="flex w-full items-start justify-between">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#fee2e2,#fecaca)] text-[#dc2626] shadow-[0_6px_14px_rgba(47,42,36,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] transition group-hover:scale-110 group-hover:text-[#dc2626]">
                                                <Timer className="h-[22px] w-[22px]" />
                                            </span>
                                            <ArrowRight className="h-4 w-4 text-[#dc2626]/40 transition group-hover:translate-x-1 group-hover:text-[#dc2626]" />
                                        </div>
                                        <div className="mt-1 w-full text-left">
                                            <span className="block truncate text-[14px] font-black text-[#ff7a00] transition-colors group-hover:text-[#dc2626]">{t("home.startMockTest", "Kiểm tra ngay")}</span>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex flex-col gap-2 h-full justify-center">
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] font-bold text-[var(--color-primary-strong)] shadow-[0_10px_24px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5"
                                        >
                                            {t("login.login")}
                                        </Link>
                                        <Link
                                            href="/register"
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-[13px] font-bold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/16"
                                        >
                                            {t("register.submit")}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openImagePicker}
                        className="group relative w-full lg:w-[380px] xl:w-[460px] aspect-[16/9] lg:aspect-auto h-[160px] lg:h-full overflow-hidden rounded-[22px] border border-white/22 bg-white/12 shadow-[0_18px_36px_rgba(0,0,0,0.16)] backdrop-blur-md shrink-0"
                        aria-label={t("home.changeHeroImage", "Đổi ảnh hero")}
                    >
                        {heroImage?.match(/\.(mp4|webm)$/i) ? (
                            <video
                                src={heroImage}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="absolute inset-0 h-full w-full object-fill transition duration-300 group-hover:scale-[1.03]"
                            />
                        ) : (
                            <Image
                                src={heroImage}
                                alt="J-Deki Go"
                                fill
                                priority
                                sizes="100vw"
                                unoptimized
                                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                        )}
                    </button>
                </div>
            </article>

            <section className="grid gap-3 lg:grid-cols-[1.45fr_0.75fr]">
                <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#fdfaf5] shadow-[0_14px_34px_rgba(47,42,36,0.08)]">
                    <div className="relative z-20 p-5 pb-6 lg:w-[68%] flex flex-col justify-center h-full">
                        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                            <BookOpen className="h-4 w-4 !text-[var(--color-primary)]" strokeWidth={2.5} />
                            {t("home.introLabel", "Giới thiệu")}
                        </p>
                        <h2 className="mt-2 text-[16px] font-black leading-snug text-[#2f2a24] sm:text-[18px]">
                            {t("home.introOfficialTitle", "FPT大学カントー校における日本語非専攻学生の自主学習能力向上を支援するウェブサイトの構築")}
                        </h2>
                        <h3 className="mt-1.5 text-[12px] font-bold leading-relaxed text-[#6b6255] border-l-2 border-[#e85d04] pl-2.5">
                            {t("home.introSubTitle", "Xây dựng website hỗ trợ nâng cao năng lực học tập tự chủ dành cho sinh viên không chuyên tiếng Nhật tại Trường Đại học FPT Cần Thơ")}
                        </h3>

                        <div className="mt-4 space-y-2 text-[13px] leading-relaxed text-[#4a4a4a] font-medium relative z-20 pr-4 sm:pr-0">
                            <p>
                                <strong className="text-[#e85d04]">J-DEKI GO</strong> {t("home.introJDekiGo", "là website hỗ trợ nâng cao năng lực học tập tự chủ dành cho sinh viên không chuyên tiếng Nhật tại Trường Đại học FPT Cần Thơ.")}
                            </p>
                            <p>
                                {t("home.introContent", "Nội dung bám sát giáo trình Dekiru Nihongo, giúp bạn học - luyện tập - kiểm tra một cách hiệu quả và theo dõi tiến độ học tập của mình.")}
                            </p>
                        </div>
                    </div>

                    <div className="absolute right-0 bottom-0 top-0 w-[45%] sm:w-[40%] flex items-end justify-end pointer-events-none overflow-hidden rounded-2xl z-10">
                        <Image
                            src="/images/intro-cat-v2-transparent.png"
                            alt="J-DEKI GO Mascot"
                            width={1024}
                            height={1024}
                            className="object-contain object-right-bottom h-[95%] w-full lg:h-[105%] mix-blend-multiply"
                            quality={75}
                            unoptimized={true}
                            priority
                        />
                    </div>
                </article>

                <article className="flex min-h-[260px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_14px_34px_rgba(47,42,36,0.08)] lg:h-full">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                                <Clock3 className="h-4 w-4" />
                                {t("home.recentStudySetsTitle", "Học phần gần đây")}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {!isStudySetsReady ? (
                            <LoadingState message={t("studySet.loadingSets", "Đang tải học phần đã tạo...")} rows={2} compact />
                        ) : focusActions.length === 0 ? (
                            <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text-soft)]">
                                {t("studySet.emptySets")}
                            </p>
                        ) : focusActions.map((action) => {
                            const ActionIcon = action.icon;

                            return (
                                <Link
                                    key={action.title}
                                    href={action.href}
                                    className="group flex items-center gap-3 rounded-2xl border border-[color:var(--action-border)] bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_58%,var(--action-tint)_100%)] p-3 text-[#2f2a24] shadow-[0_8px_20px_rgba(47,42,36,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:-translate-y-0.5 hover:border-[color:var(--action-color)] hover:shadow-[0_14px_30px_var(--action-glow),inset_0_1px_0_rgba(255,255,255,0.96)]"
                                    style={{
                                        "--action-color": action.color,
                                        "--action-tint": action.tint,
                                        "--action-border": action.border,
                                        "--action-glow": action.glow,
                                    }}
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ffffff,var(--action-tint))] shadow-[0_8px_18px_rgba(47,42,36,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]" style={{ color: action.color }}>
                                        {action.kind === "text-kanji" ? (
                                            <span className="text-xl font-black leading-none">漢</span>
                                        ) : (
                                            <ActionIcon className="h-5 w-5" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold text-[#2f2a24]">{action.title}</span>
                                        <span className="mt-0.5 block text-xs leading-5 text-[#6f6257]">{action.desc}</span>
                                    </span>
                                    <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" style={{ color: action.color }} />
                                </Link>
                            );
                        })}
                    </div>
                </article>
            </section>

            {isImagePickerOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm" onClick={closeImagePicker}>
                    <div
                        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.25)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {heroImageOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => applyImagePath(option)}
                                    className={`overflow-hidden rounded-[18px] border p-1 transition hover:-translate-y-0.5 ${heroImage === option ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}
                                >
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[var(--color-bg-soft)]">
                                        {option?.match(/\.(mp4|webm)$/i) ? (
                                            <video src={option} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
                                        ) : (
                                            <Image src={option} alt={option} fill className="object-cover" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <section className="mt-2 space-y-3">
                <div className="flex items-center gap-3">
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        <Route className="h-4 w-4" />
                        CHỨC NĂNG CHÍNH
                    </p>
                </div>
                <div className="grid min-h-0 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {modules.map((module) => {
                        const Icon = module.icon;
                        const colorVal = module.iconVar ? `var(${module.iconVar})` : "var(--color-primary)";

                        return (
                            <Link
                                key={module.title}
                                href={module.href}
                                className="relative overflow-hidden group flex h-48 flex-col border-2 justify-between rounded-[22px] border p-3 text-[var(--color-text)] shadow-[0_14px_30px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.5)] sm:h-52"
                                style={{
                                    background: "var(--color-surface)",
                                    borderColor: colorVal,
                                }}
                            >
                                <div className="absolute bottom-0 right-0 w-56 h-56 pointer-events-none transition-transform duration-500 group-hover:scale-[1.05] origin-bottom-right" style={{ color: colorVal }}>
                                    {/* Mảng sóng lượn hơi nhòe */}
                                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-current blur-[6px]">
                                        <path d="M0,100 C40,90 60,20 100,10 L100,100 Z" fill="currentColor" opacity="0.08" />
                                        <path d="M25,100 C55,95 75,50 100,40 L100,100 Z" fill="currentColor" opacity="0.15" />
                                    </svg>

                                    {/* Họa tiết chấm bi sắc nét */}
                                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-current">
                                        <g fill="var(--color-surface)" opacity="0.6">
                                            <circle cx="65" cy="70" r="1.5" />
                                            <circle cx="75" cy="70" r="1.5" />
                                            <circle cx="85" cy="70" r="1.5" />
                                            <circle cx="95" cy="70" r="1.5" />

                                            <circle cx="65" cy="80" r="1.5" />
                                            <circle cx="75" cy="80" r="1.5" />
                                            <circle cx="85" cy="80" r="1.5" />
                                            <circle cx="95" cy="80" r="1.5" />

                                            <circle cx="65" cy="90" r="1.5" />
                                            <circle cx="75" cy="90" r="1.5" />
                                            <circle cx="85" cy="90" r="1.5" />
                                            <circle cx="95" cy="90" r="1.5" />
                                        </g>
                                    </svg>
                                </div>

                                <div className="relative z-10">
                                    <div
                                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/35 bg-white shadow-[0_12px_22px_rgba(0,0,0,0.14)]"
                                        style={{
                                            color: colorVal,
                                            background: module.iconBgVar ? `var(${module.iconBgVar})` : "#ffffff",
                                        }}
                                    >
                                        {module.kind === "text-kanji" ? (
                                            <span className="flex h-4 w-4 items-center justify-center text-lg font-bold leading-none translate-y-px" style={{ color: colorVal }}>
                                                漢
                                            </span>
                                        ) : (
                                            <Icon className="h-6 w-6" style={{ color: colorVal, stroke: colorVal }} />
                                        )}
                                    </div>
                                    <div className="mt-3.5 mb-1.5">
                                        <h3 className="text-[17px] font-black tracking-tight" style={{ color: colorVal }}>
                                            {module.title}
                                        </h3>
                                        <div className="mt-1 h-[3px] w-6 rounded-full" style={{ backgroundColor: colorVal }} />
                                    </div>
                                    <p className="line-clamp-3 text-[13px] leading-relaxed text-[var(--color-text-soft)]">{module.summary}</p>
                                </div>

                                <div className="mt-2 flex items-center justify-end">
                                    <ArrowRight className="h-4 w-4" style={{ color: colorVal }} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* KHẢO SÁT SECTION */}
            <section className="mt-2 space-y-3">
                <div className="flex items-center gap-3">
                    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ff7a00]">
                        <BarChart2 className="h-4 w-4" />
                        {t("home.surveyTitle", "KHẢO SÁT")}
                    </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.40fr_0.75fr]">
                    {/* LEFT BLOCK: Before & After */}
                    <div className="bg-[#fffaf8] border border-[#fed7aa] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-3 shadow-[0_4px_20px_rgba(244,63,94,0.06)] relative overflow-hidden">
                        {/* Card 1: Trước khi sử dụng */}
                        <div className="relative z-10 w-full sm:w-[32%] bg-[#dbeafe] border border-[#bfdbfe] rounded-xl p-3 sm:p-4 shadow-sm flex flex-col gap-1.5 sm:h-full justify-center backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#3b82f6] shadow-[0_2px_8px_rgba(59,130,246,0.15)] border border-[#bfdbfe]">
                                    <ClipboardList className="h-3.5 w-3.5" />
                                </span>
                                <h4 className="text-[13px] font-bold text-[#1d4ed8]">{t("home.surveyBeforeTitle", "Trước khi sử dụng")}</h4>
                            </div>
                            <p className="text-[11px] text-[#475569] leading-relaxed font-medium mt-1 mb-2">
                                {t("home.surveyBeforeDesc", "Hãy dành ít phút hoàn thành khảo sát trước khi bắt đầu học nhé!")}
                            </p>
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSdj0AiiZavkyfD7eRucGSzegaQ1cShWrJ0xVWMXM2PQUSa9mg/viewform?usp=dialog"
                                target="_blank"
                                rel="noreferrer"
                                className="mt-auto flex items-center justify-center gap-1 w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold py-1.5 rounded-full transition shadow-[0_4px_14px_rgba(59,130,246,0.25)]"
                            >
                                {t("home.surveyGoTo", "Đi đến khảo sát")} <ArrowRight className="h-3 w-3" />
                            </a>
                        </div>

                        {/* Middle Illustration */}
                        <div className="flex-1 flex justify-center items-center h-[90px] sm:h-[150px] lg:h-[165px] min-w-[120px] px-2 sm:px-4">
                            {/* Left Arrow (only visible on sm+) */}
                            <div className="hidden sm:flex flex-1 justify-center text-[#3b82f6]/80">
                                <svg viewBox="0 0 50 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[45px] max-w-[65px] h-auto">
                                    <line x1="0" y1="12" x2="42" y2="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" strokeLinecap="round" />
                                    <path d="M34 4L44 12L34 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>

                            <Image
                                src="/images/survey-left-new.png"
                                alt="Students studying"
                                width={280}
                                height={180}
                                className="object-contain h-[110%] w-auto mix-blend-multiply hover:scale-105 transition-transform duration-300 mx-2"
                            />

                            {/* Right Arrow (only visible on sm+) */}
                            <div className="hidden sm:flex flex-1 justify-center text-[#10b981]/80">
                                <svg viewBox="0 0 50 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full min-w-[45px] max-w-[65px] h-auto">
                                    <line x1="0" y1="12" x2="42" y2="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" strokeLinecap="round" />
                                    <path d="M34 4L44 12L34 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>

                        {/* Card 2: Sau khi sử dụng */}
                        <div className="relative z-10 w-full sm:w-[32%] bg-[#d1fae5] border border-[#a7f3d0] rounded-xl p-3 sm:p-4 shadow-sm flex flex-col gap-1.5 sm:h-full justify-center backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#10b981] shadow-[0_2px_8px_rgba(16,185,129,0.15)] border border-[#6ee7b7]">
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                </span>
                                <h4 className="text-[13px] font-bold text-[#047857]">{t("home.surveyAfterTitle", "Sau khi sử dụng")}</h4>
                            </div>
                            <p className="text-[11px] text-[#475569] leading-relaxed font-medium mt-1 mb-2">
                                {t("home.surveyAfterDesc", "Chia sẻ ý kiến của bạn để giúp chúng mình cải thiện tốt hơn!")}
                            </p>
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSeVcC03bdDBs3iCODkOkq6NIK2HAVesYsIt_N5f9Jtm8F0sgA/viewform?usp=dialog"
                                target="_blank"
                                rel="noreferrer"
                                className="mt-auto flex items-center justify-center gap-1 w-full bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-bold py-1.5 rounded-full transition shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                            >
                                {t("home.surveyGoTo", "Đi đến khảo sát")} <ArrowRight className="h-3 w-3" />
                            </a>
                        </div>
                    </div>

                    {/* RIGHT BLOCK: Thank you */}
                    <div className="bg-[#fff0eb] border border-[#fed7aa] rounded-2xl p-5 shadow-[0_4px_20px_rgba(244,63,94,0.06)] relative overflow-hidden flex flex-col justify-between min-h-[170px]">
                        <div className="relative z-10 w-[65%]">
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="text-[16px] leading-none">🌸</span>
                                <h3 className="text-[14px] font-black text-[#e11d48] uppercase tracking-wide">{t("home.thankYouTitle", "CẢM ƠN BẠN!")}</h3>
                            </div>
                            <p className="text-[11px] text-[#881337] leading-[1.6] font-semibold mb-3 pr-2">
                                {t("home.thankYouDesc", "Cảm ơn bạn đã đồng hành cùng J-DEKI GO. Chúc bạn học tập tốt và sớm đạt được mục tiêu tiếng Nhật của mình!")}
                            </p>
                            <div className="text-[17px] font-black text-[#f97316] tracking-widest drop-shadow-sm">
                                {t("home.goodLuck", "頑張ってください！")}
                            </div>
                        </div>

                        {/* Right Illustration */}
                        <div className="absolute right-[-10px] bottom-[-5px] w-[150px] h-[150px] pointer-events-none">
                            <Image src="/images/fuji-daruma-sakura.png" alt="Daruma and Fuji" fill className="object-contain object-bottom mix-blend-multiply" sizes="100vw" />
                        </div>
                    </div>
                </div>
            </section>
        </section>
    );
}

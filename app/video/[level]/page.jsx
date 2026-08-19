"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { ChevronLeft, Film } from "lucide-react";

const VIDEO_LEVELS = {
    JPD113: {
        title: "JPD113",
        subtitle: "Nền tảng - Video",
        description: "Xem các video bài giảng nền tảng và mẹo tự học hiệu quả.",
    },
    JPD123: {
        title: "JPD123",
        subtitle: "Tăng tốc - Video",
        description: "Xem các video bài giảng nâng cao và chia sẻ phương pháp học tập.",
    },
};

function PlayerCard({ title, videoId }) {
    const iframeRef = useRef(null);
    const playerRef = useRef(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const embedUrl = `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&fs=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
    const playerId = `yt-player-${videoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

    useEffect(() => {
        if (!iframeRef.current) return;
        let mounted = true;

        function createPlayer() {
            if (!mounted || !window.YT?.Player) return;
            try {
                playerRef.current = new window.YT.Player(playerId, {
                    playerVars: { modestbranding: 1, iv_load_policy: 3, rel: 0, playsinline: 1 },
                });
            } catch (error) {
                // Ignore YouTube API create errors.
            }
        }

        if (window.YT?.Player) {
            createPlayer();
        } else {
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () {
                if (typeof previousReady === "function") previousReady();
                createPlayer();
            };

            if (!document.querySelector("script[data-yt-api]")) {
                const tag = document.createElement("script");
                tag.src = "https://www.youtube.com/iframe_api";
                tag.setAttribute("data-yt-api", "1");
                document.body.appendChild(tag);
            }
        }

        return () => {
            mounted = false;
            if (playerRef.current?.destroy) {
                try {
                    playerRef.current.destroy();
                } catch (error) {
                    // Ignore cleanup errors.
                }
            }
        };
    }, [playerId]);

    return (
        <article className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="relative aspect-video overflow-hidden bg-black">
                <iframe
                    id={playerId}
                    ref={iframeRef}
                    className="h-full w-full"
                    src={embedUrl}
                    title={title}
                    loading="lazy"
                    allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; gyroscope; web-share"
                    allowFullScreen
                />
            </div>
            <div className="border-t border-[var(--color-border)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
            </div>
        </article>
    );
}

export default function VideoLevelPage(props) {
    const params = use(props.params);
    const level = String(params?.level || "").toUpperCase();
    const currentLevel = VIDEO_LEVELS[level] || VIDEO_LEVELS.JPD113;
    const [items, setItems] = useState([]);

    useEffect(() => {
        let mounted = true;

        const loadItems = async () => {
            try {
                const res = await fetch(`/api/content?module=video&level=${encodeURIComponent(level || "JPD113")}`);
                const payload = await res.json();
                const data = Array.isArray(payload?.data?.items) ? payload.data.items : payload?.items || [];
                const mapped = data.map((item) => ({
                    id: item.id || String(item._id || ""),
                    title: item.title || "",
                    videoId: item.youtubeVideoId || "",
                })).filter((item) => item.videoId);
                if (mounted) setItems(mapped);
            } catch (error) {
                if (mounted) setItems([]);
            }
        };

        loadItems();
        return () => {
            mounted = false;
        };
    }, [level]);

    return (
        <section className="dashboard-shell relative space-y-3 p-3 sm:p-4">
            <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--icon-video-bg)] text-[var(--icon-video)] shadow-[0_10px_24px_rgba(6,182,212,0.16)]">
                    <Film className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="section-title">{currentLevel.title}</h1>
                    <p className="text-sm text-[var(--color-text-soft)]">{currentLevel.subtitle}</p>
                </div>
            </div>

            <div className="absolute right-3 top-3">
                <Link href="/video" aria-label="Quay lại" className="back-action inline-flex items-center gap-2 rounded-full border border-transparent bg-[#ecfeff] px-3 py-1 text-sm font-medium text-[var(--icon-video)] hover:bg-[#cffafe]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[var(--icon-video)]">
                        <ChevronLeft className="h-4 w-4" />
                    </span>
                    <span className="back-label whitespace-nowrap">Quay lại</span>
                </Link>
            </div>

            <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-soft)]">
                {currentLevel.description}
            </p>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                    <PlayerCard key={item.id} title={item.title} videoId={item.videoId} />
                ))}
            </div>
        </section>
    );
}

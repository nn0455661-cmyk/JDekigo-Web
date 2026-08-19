import { cachedRequest, getCachedValue, prefetchCachedRequest, stableCacheKey } from "@/src/lib/client-cache";

const SPEAKING_TTL_MS = 5 * 60 * 1000;

export function getSpeakingLevelKey(level) {
    return stableCacheKey("speaking:level", { level: String(level || "").toUpperCase() });
}

async function fetchSpeakingLevel(level) {
    const response = await fetch(`/api/content?module=speaking&level=${encodeURIComponent(level)}`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || "Không tải được danh sách speaking.");
    }

    const items = Array.isArray(payload?.data?.items) ? payload.data.items : payload?.items || [];
    return items.sort((left, right) => (Number(left.setOrder) || 999) - (Number(right.setOrder) || 999));
}

export function getCachedSpeakingLevel(level) {
    return getCachedValue(getSpeakingLevelKey(level));
}

export function listSpeakingLevel(level, options = {}) {
    return cachedRequest(
        getSpeakingLevelKey(level),
        () => fetchSpeakingLevel(level),
        { ttlMs: SPEAKING_TTL_MS, force: Boolean(options.force) }
    );
}

export function prefetchSpeakingLevel(level) {
    prefetchCachedRequest(
        getSpeakingLevelKey(level),
        () => fetchSpeakingLevel(level),
        { ttlMs: SPEAKING_TTL_MS }
    );
}

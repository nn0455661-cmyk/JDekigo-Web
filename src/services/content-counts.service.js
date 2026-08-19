import { cachedRequest, getCachedValue, prefetchCachedRequest, stableCacheKey } from "@/src/lib/client-cache";
import api from "src/lib/axios";

const COUNT_TTL_MS = 2 * 60 * 1000;
const EMPTY_STATS = {
    counts: { JPD113: 0, JPD123: 0 },
    itemCounts: { JPD113: 0, JPD123: 0 },
};

function countKey(moduleKey) {
    return stableCacheKey("content-counts", { module: moduleKey });
}

async function fetchContentStats(moduleKey) {
    const response = await api.get("/api/content-counts", { params: { module: moduleKey } });
    const data = response.data?.data;
    return {
        counts: data?.counts || EMPTY_STATS.counts,
        itemCounts: data?.itemCounts || data?.counts || EMPTY_STATS.itemCounts,
        speakingItems: data?.speakingItems,
        readingItems: data?.readingItems,
    };
}

export function getCachedContentCounts(moduleKey) {
    return getCachedValue(countKey(moduleKey))?.counts;
}

export function getCachedContentStats(moduleKey) {
    return getCachedValue(countKey(moduleKey));
}

export async function getContentCounts(moduleKey) {
    const stats = await getContentStats(moduleKey);
    return stats.counts;
}

export async function getContentStats(moduleKey) {
    return cachedRequest(countKey(moduleKey), () => fetchContentStats(moduleKey), { ttlMs: COUNT_TTL_MS });
}

export function prefetchContentStats(moduleKey) {
    prefetchCachedRequest(countKey(moduleKey), () => fetchContentStats(moduleKey), { ttlMs: COUNT_TTL_MS });
}

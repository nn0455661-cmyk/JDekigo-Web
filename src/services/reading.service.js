import api from "src/lib/axios";
import { cachedRequest, getCachedValue, prefetchCachedRequest, stableCacheKey } from "@/src/lib/client-cache";

async function fetchReadings() {
    const res = await api.get("/api/reading");
    return res.data;
}

export async function getReadings() {
    return cachedRequest("content:reading:all", fetchReadings);
}

export async function getReadingByLevel(level) {
    const normalizedLevel = String(level || "").toUpperCase();
    return cachedRequest(stableCacheKey("content:reading:level", { level: normalizedLevel }), async () => {
        const res = await api.get(`/api/reading?level=${encodeURIComponent(normalizedLevel)}`);
        return res.data;
    });
}

export function prefetchReadings() {
    prefetchCachedRequest("content:reading:all", fetchReadings);
}

export function prefetchReadingByLevel(level) {
    const normalizedLevel = String(level || "").toUpperCase();
    prefetchCachedRequest(stableCacheKey("content:reading:level", { level: normalizedLevel }), async () => {
        const res = await api.get(`/api/reading?level=${encodeURIComponent(normalizedLevel)}`);
        return res.data;
    });
}

export function getCachedReadings() {
    return getCachedValue("content:reading:all");
}

export function getCachedReadingByLevel(level) {
    const normalizedLevel = String(level || "").toUpperCase();
    return getCachedValue(stableCacheKey("content:reading:level", { level: normalizedLevel }));
}

const readingService = {
    getReadings,
    getReadingByLevel,
    prefetchReadings,
    prefetchReadingByLevel,
    getCachedReadings,
    getCachedReadingByLevel,
};

export default readingService;

import api from "src/lib/axios";
import { cachedRequest, getCachedValue, prefetchCachedRequest, stableCacheKey } from "@/src/lib/client-cache";

export async function getTests(params = {}) {
    return cachedRequest(stableCacheKey("tests:list", params), async () => {
        const res = await api.get("/api/tests", { params });
        return res.data;
    }, { ttlMs: 2 * 60 * 1000 });
}

export async function getTestById(id, params = {}) {
    const requestParams = { id, ...params };
    return cachedRequest(stableCacheKey("tests:item", requestParams), async () => {
        const res = await api.get("/api/tests", {
            params: requestParams,
        });

        return res.data;
    }, { ttlMs: 2 * 60 * 1000 });
}

export async function getPublishedQuestions(params = {}) {
    const res = await api.get("/api/questions", { params });
    return res.data?.data ?? res.data;
}

export function prefetchTests(params = {}) {
    prefetchCachedRequest(stableCacheKey("tests:list", params), async () => {
        const res = await api.get("/api/tests", { params });
        return res.data;
    }, { ttlMs: 2 * 60 * 1000 });
}

export function getCachedTests(params = {}) {
    return getCachedValue(stableCacheKey("tests:list", params));
}

const testService = { getTests, getTestById, getPublishedQuestions, prefetchTests, getCachedTests };

export default testService;

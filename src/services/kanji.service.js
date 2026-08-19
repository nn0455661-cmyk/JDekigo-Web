import api from "src/lib/axios";
import { cachedRequest, getCachedValue, prefetchCachedRequest } from "@/src/lib/client-cache";

const KANJI_CACHE_KEY = "content:kanji";

function normalizeKanjiItem(item = {}) {
    return {
        ...item,
        reading: item.reading || item.hiraganaText || item.onyomi || item.kunyomi || "",
        hanviet: item.hanviet || item.hanViet || item.sinoVietnamese || "",
        onyomi: item.onyomi || "",
        kunyomi: item.kunyomi || "",
    };
}

export async function getKanji() {
    return cachedRequest(KANJI_CACHE_KEY, fetchKanji);
}

async function fetchKanji() {
    const res = await api.get("/api/kanji");
    const payload = res.data;

    if (Array.isArray(payload?.data?.data)) {
        return {
            ...payload,
            data: {
                ...payload.data,
                data: payload.data.data.map(normalizeKanjiItem),
                lessons: Array.isArray(payload.data.lessons) ? payload.data.lessons : [],
            },
        };
    }

    if (Array.isArray(payload?.data)) {
        return {
            ...payload,
            data: payload.data.map(normalizeKanjiItem),
        };
    }

    return payload;
}

export function prefetchKanji() {
    prefetchCachedRequest(KANJI_CACHE_KEY, fetchKanji);
}

export function getCachedKanji() {
    return getCachedValue(KANJI_CACHE_KEY);
}

const kanjiService = { getKanji, prefetchKanji, getCachedKanji };

export default kanjiService;

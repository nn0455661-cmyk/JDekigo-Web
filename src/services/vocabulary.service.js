import api from "src/lib/axios";
import { cachedRequest, getCachedValue, prefetchCachedRequest } from "@/src/lib/client-cache";

const VOCABULARY_CACHE_KEY = "content:vocabulary";

async function fetchVocabulary() {
    const res = await api.get("/api/vocabulary");
    return res.data;
}

export async function getVocabulary() {
    return cachedRequest(VOCABULARY_CACHE_KEY, fetchVocabulary);
}

export function prefetchVocabulary() {
    prefetchCachedRequest(VOCABULARY_CACHE_KEY, fetchVocabulary);
}

export function getCachedVocabulary() {
    return getCachedValue(VOCABULARY_CACHE_KEY);
}

const vocabularyService = { getVocabulary, prefetchVocabulary, getCachedVocabulary };

export default vocabularyService;

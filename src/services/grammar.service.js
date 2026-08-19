import api from "src/lib/axios";
import { cachedRequest, getCachedValue, prefetchCachedRequest } from "@/src/lib/client-cache";

const GRAMMAR_CACHE_KEY = "content:grammar";

async function fetchGrammar() {
    const res = await api.get("/api/grammar");
    return res.data;
}

export async function getGrammar() {
    return cachedRequest(GRAMMAR_CACHE_KEY, fetchGrammar);
}

export function prefetchGrammar() {
    prefetchCachedRequest(GRAMMAR_CACHE_KEY, fetchGrammar);
}

export function getCachedGrammar() {
    return getCachedValue(GRAMMAR_CACHE_KEY);
}

const grammarService = { getGrammar, prefetchGrammar, getCachedGrammar };

export default grammarService;

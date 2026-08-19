import api from "src/lib/axios";
import { cachedRequest, clearCachedValue, getCachedValue, prefetchCachedRequest, setCachedValue } from "@/src/lib/client-cache";

const STUDY_SET_CACHE_KEY = "study-sets:list";
const STUDY_SET_TTL_MS = 2 * 60 * 1000;

async function unwrap(response) {
    return response.data?.data ?? response.data;
}

function extractItems(value) {
    if (Array.isArray(value)) return value;
    return value?.items || value?.studySets || [];
}

function withItems(value, items) {
    if (Array.isArray(value)) return items;
    return { ...(value || {}), items };
}

function updateStudySetCache(updater) {
    const current = getCachedValue(STUDY_SET_CACHE_KEY);

    try {
        const currentItems = extractItems(current);
        const nextItems = updater(Array.isArray(currentItems) ? currentItems : []);
        setCachedValue(STUDY_SET_CACHE_KEY, withItems(current, nextItems), STUDY_SET_TTL_MS);
    } catch {
        clearCachedValue(STUDY_SET_CACHE_KEY);
    }
}

async function fetchStudySets() {
    const res = await api.get("/api/study-set");
    return unwrap(res);
}

export async function getStudySets(options = {}) {
    return cachedRequest(STUDY_SET_CACHE_KEY, fetchStudySets, { ttlMs: STUDY_SET_TTL_MS, force: Boolean(options.force) });
}

export function prefetchStudySets() {
    prefetchCachedRequest(STUDY_SET_CACHE_KEY, fetchStudySets, { ttlMs: STUDY_SET_TTL_MS });
}

export function getCachedStudySets() {
    return getCachedValue(STUDY_SET_CACHE_KEY);
}

export async function createStudySet(payload) {
    const res = await api.post("/api/study-set", payload);
    const createdPayload = unwrap(res);
    const created = createdPayload?.item || createdPayload;
    updateStudySetCache((items) => [
        created,
        ...items.filter((item) => String(item._id || item.id) !== String(created?._id || created?.id)),
    ]);
    return createdPayload;
}

export async function updateStudySet(id, payload) {
    const res = await api.patch(`/api/study-set/${id}`, payload);
    const updatedPayload = unwrap(res);
    const updated = updatedPayload?.item || updatedPayload;
    updateStudySetCache((items) => {
        const matched = items.some((item) => String(item._id || item.id) === String(id));
        if (!matched) {
            return [updated, ...items];
        }

        return items.map((item) => String(item._id || item.id) === String(id) ? updated : item);
    });
    return updatedPayload;
}

export async function deleteStudySet(id) {
    const res = await api.delete(`/api/study-set/${id}`);
    const deletedPayload = unwrap(res);
    updateStudySetCache((items) => items.filter((item) => String(item._id || item.id) !== String(id)));
    return deletedPayload;
}

const studysetService = { getStudySets, prefetchStudySets, getCachedStudySets, createStudySet, updateStudySet, deleteStudySet };

export default studysetService;

import api from "@/src/lib/axios";

export function getHistoryStorageKey(module, level) {
    if (module === "mock-test") {
        return `mock-test-history:${level}`;
    }

    if (module === "reading") {
        return `reading-typing-history:${level}`;
    }

    return `${module}-test-history:${level}`;
}

export function loadLocalTestHistory(module, level) {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(getHistoryStorageKey(module, level));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveLocalTestHistory(module, level, item, limit = 10) {
    if (typeof window === "undefined") {
        return null;
    }

    const record = {
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        module,
        level,
        title: item.title || item.testTitle,
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
    };

    const existing = loadLocalTestHistory(module, level);
    const next = [record, ...existing].slice(0, limit);
    window.localStorage.setItem(getHistoryStorageKey(module, level), JSON.stringify(next));
    return record;
}

export async function saveTestHistory(data) {
    try {
        const response = await api.post("/api/history", data);
        return response.data?.data || response.data;
    } catch (error) {
        throw error;
    }
}

export async function fetchTestHistory(module, level, page = 1, limit = 100) {
    try {
        const response = await api.get("/api/history", {
            params: { module, level, page, limit }
        });
        return response.data?.data || response.data;
    } catch (error) {
        throw error;
    }
}

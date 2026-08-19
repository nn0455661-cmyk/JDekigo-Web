const memoryCache = new Map();
const inFlightRequests = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const SESSION_CACHE_PREFIX = "jlearn-cache:";

let cacheGeneration = 0;

function canUseSessionStorage() {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function now() {
    return Date.now();
}

function readSessionCache(key) {
    if (!canUseSessionStorage()) return null;

    try {
        const raw = window.sessionStorage.getItem(`jlearn-cache:${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.expiresAt <= now()) {
            window.sessionStorage.removeItem(`jlearn-cache:${key}`);
            return null;
        }
        return parsed.value;
    } catch {
        return null;
    }
}

function writeSessionCache(key, value, ttlMs) {
    if (!canUseSessionStorage()) return;

    try {
        window.sessionStorage.setItem(`jlearn-cache:${key}`, JSON.stringify({
            expiresAt: now() + ttlMs,
            value,
        }));
    } catch {
        // Cache should never block the app.
    }
}

export function getCachedValue(key) {
    const cached = memoryCache.get(key);
    if (cached && cached.expiresAt > now()) {
        return cached.value;
    }

    if (cached) {
        memoryCache.delete(key);
    }

    const sessionValue = readSessionCache(key);
    if (sessionValue !== null) {
        memoryCache.set(key, { value: sessionValue, expiresAt: now() + DEFAULT_TTL_MS });
        return sessionValue;
    }

    return null;
}

export function setCachedValue(key, value, ttlMs = DEFAULT_TTL_MS) {
    const expiresAt = now() + ttlMs;
    memoryCache.set(key, { value, expiresAt });
    writeSessionCache(key, value, ttlMs);
    return value;
}

export function clearCachedValue(key) {
    memoryCache.delete(key);
    if (!canUseSessionStorage()) return;

    try {
        window.sessionStorage.removeItem(`jlearn-cache:${key}`);
    } catch {
        // Ignore cache cleanup failures.
    }
}

export function clearClientCache() {
    cacheGeneration += 1;
    memoryCache.clear();
    inFlightRequests.clear();

    if (!canUseSessionStorage()) return;

    try {
        const keysToRemove = [];
        for (let index = 0; index < window.sessionStorage.length; index += 1) {
            const key = window.sessionStorage.key(index);
            if (key?.startsWith(SESSION_CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
        // Cache cleanup should never block logout/session reset.
    }
}

export async function cachedRequest(key, fetcher, options = {}) {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const force = Boolean(options.force);
    const requestGeneration = cacheGeneration;

    if (!force) {
        const cached = getCachedValue(key);
        if (cached !== null) return cached;
    }

    if (!force && inFlightRequests.has(key)) {
        return inFlightRequests.get(key);
    }

    const request = Promise.resolve()
        .then(fetcher)
        .then((value) => {
            if (requestGeneration !== cacheGeneration) {
                return value;
            }

            return setCachedValue(key, value, ttlMs);
        })
        .finally(() => {
            if (inFlightRequests.get(key) === request) {
                inFlightRequests.delete(key);
            }
        });

    inFlightRequests.set(key, request);
    return request;
}

export function prefetchCachedRequest(key, fetcher, options = {}) {
    if (getCachedValue(key) !== null || inFlightRequests.has(key)) {
        return;
    }

    void cachedRequest(key, fetcher, options).catch(() => {
        // Prefetch is opportunistic.
    });
}

export function stableCacheKey(prefix, params = {}) {
    const entries = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([left], [right]) => left.localeCompare(right));
    return `${prefix}:${JSON.stringify(Object.fromEntries(entries))}`;
}

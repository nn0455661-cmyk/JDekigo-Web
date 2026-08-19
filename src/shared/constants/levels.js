export const SUPPORTED_LEVELS = ["JPD113", "JPD123"];

export const DEFAULT_LEVEL = SUPPORTED_LEVELS[0];

const LEGACY_LEVEL_TO_PROGRAM_LEVEL = {
    N5: "JPD113",
    N4: "JPD123",
    N3: "JPD123",
    N2: "JPD123",
    N1: "JPD123",
};

export function normalizeLevel(level) {
    const normalized = String(level || "").trim().toUpperCase();

    if (SUPPORTED_LEVELS.includes(normalized)) {
        return normalized;
    }

    return LEGACY_LEVEL_TO_PROGRAM_LEVEL[normalized] || DEFAULT_LEVEL;
}

export function normalizeItemsLevel(items = []) {
    return items
        .map((item) => ({
            ...item,
            level: normalizeLevel(item.level),
        }))
        .filter((item) => SUPPORTED_LEVELS.includes(item.level));
}

import { clearClientCache } from "@/src/lib/client-cache";
import { EXAM_LOCK_STORAGE_KEY } from "@/src/services/exam-lock.service";

const USER_SCOPED_LOCAL_STORAGE_PREFIXES = [
    "admin-test-draft:",
    "flashcard-progress:",
    "grammar-history-reset:",
    "grammar-practice:",
    "grammar-practice-history:",
    "grammar-test:",
    "grammar-test-history:",
    "kanji-practice:",
    "kanji-practice-history:",
    "kanji-test:",
    "kanji-test-history:",
    "mock-test:",
    "mock-test-history:",
    "mock-test-run:",
    "mock-test-selected:",
    "reading-typing-history:",
    "study-set-progress:",
    "vocabulary-practice:",
    "vocabulary-test:",
    "vocabulary-test-history:",
];

function removeStorageKeysByPrefix(storage, prefixes) {
    if (!storage) {
        return;
    }

    try {
        const keysToRemove = [];
        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (prefixes.some((prefix) => key?.startsWith(prefix))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach((key) => storage.removeItem(key));
    } catch {
        // Storage cleanup is best-effort.
    }
}

export function clearUserScopedClientState() {
    clearClientCache();

    if (typeof window === "undefined") {
        return;
    }

    removeStorageKeysByPrefix(window.localStorage, USER_SCOPED_LOCAL_STORAGE_PREFIXES);

    try {
        window.sessionStorage.removeItem(EXAM_LOCK_STORAGE_KEY);
    } catch {
        // Ignore storage failures during logout.
    }
}

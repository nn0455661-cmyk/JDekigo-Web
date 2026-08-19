export const EXAM_LOCK_STORAGE_KEY = "jlearn_exam_lock";
export const EXAM_LOCK_EVENT = "jlearn:exam-lock-change";

export function setExamNavigationLock(locked) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        if (locked) {
            window.sessionStorage.setItem(EXAM_LOCK_STORAGE_KEY, "1");
        } else {
            window.sessionStorage.removeItem(EXAM_LOCK_STORAGE_KEY);
        }
    } catch {
        // Lock state should never break the test flow.
    }

    window.dispatchEvent(new CustomEvent(EXAM_LOCK_EVENT, { detail: { locked } }));
}

import { toast } from "react-toastify";
import formatApiError from "./formatApiError";

function safeMessage(msg) {
    if (!msg) return null;
    if (typeof msg === "string") return msg;
    try {
        return String(msg);
    } catch (e) {
        return null;
    }
}

const notifier = {
    error(errorObj, fallback = "Có lỗi xảy ra. Vui lòng thử lại.", opts = {}) {
        let friendly = null;
        if (typeof errorObj === "string") {
            friendly = errorObj;
        } else {
            friendly = formatApiError(errorObj) || safeMessage(errorObj?.response?.data?.error?.message) || safeMessage(errorObj?.message);
        }
        toast.error(friendly || fallback, opts);
    },
    info(message, opts = {}) {
        toast.info(message, opts);
    },
    success(message, opts = {}) {
        toast.success(message, opts);
    },
    mediaCleanup(message, cleanup, opts = {}) {
        if (cleanup?.skipped) {
            toast.warning(`${message}, nhưng chưa thể dọn media R2 vì cấu hình chưa đầy đủ.`, opts);
            return;
        }

        if (Number(cleanup?.failedCount || 0) > 0) {
            toast.warning(`${message}, nhưng còn ${cleanup.failedCount} file R2 chưa xóa được.`, opts);
            return;
        }

        if (Number(cleanup?.deletedCount || 0) > 0) {
            toast.success(`${message} và đã xóa ${cleanup.deletedCount} file R2.`, opts);
            return;
        }

        toast.success(message, opts);
    },
};

export default notifier;

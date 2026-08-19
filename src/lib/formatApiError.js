export function mapFieldToVietnamese(field) {
    const map = {
        title: "tiêu đề",
        content: "nội dung",
        translation: "bản dịch",
        lessonTitle: "tiêu đề bài học",
        lessonOrder: "thứ tự bài",
        email: "email",
        password: "mật khẩu",
    };

    return map[field] || field;
}

export default function formatApiError(error) {
    if (!error) return null;

    // Prefer structured message from API
    const apiMsg = error?.response?.data?.error?.message || error?.response?.data?.message;
    const status = error?.response?.status;

    // Map common HTTP statuses
    if (status === 401) return "Bạn chưa được xác thực. Vui lòng đăng nhập.";
    if (status === 403) return "Bạn không có quyền thực hiện hành động này.";
    if (status === 404) return "Không tìm thấy dữ liệu.";

    if (!apiMsg) {
        // fallback to generic network message
        if (error?.message && error.message.includes("Network Error")) return "Lỗi mạng. Vui lòng kiểm tra kết nối.";
        return null;
    }

    // Handle Mongoose validation style: "Reading validation failed: title: Path `title` is required., content: Path `content` is required."
    if (/validation failed/i.test(apiMsg) || /Path `\w+` is required/i.test(apiMsg)) {
        const fieldMatches = [...apiMsg.matchAll(/Path `([a-zA-Z0-9_]+)` is required/gi)].map((m) => m[1]);
        if (fieldMatches.length) {
            const pretty = fieldMatches.map(mapFieldToVietnamese).join(", ");
            return `Vui lòng nhập: ${pretty}.`;
        }
    }

    // Handle duplicate key
    if (/duplicate key error/i.test(apiMsg) || /E11000/.test(apiMsg)) {
        return "Dữ liệu đã tồn tại. Vui lòng kiểm tra và thử lại.";
    }

    // If API already returns Vietnamese (heuristic: presence of common Vietnamese words), use it
    if (/[\u00C0-\u1EF9\w\s]+(vui lòng|không|thất bại|thành công|lỗi)/i.test(apiMsg)) {
        return apiMsg;
    }

    // Otherwise, return the raw API message (may be English). Caller can fallback to a nicer message.
    return apiMsg;
}

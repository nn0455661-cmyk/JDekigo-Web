export const ADMIN_LEVELS = ["JPD113", "JPD123"];

export const ADMIN_MODULES = [
    { key: "vocabulary", label: "Từ vựng", description: "Từ, cách đọc và ví dụ" },
    { key: "kanji", label: "Kanji", description: "Ký tự, onyomi và kunyomi" },
    { key: "grammar", label: "Ngữ pháp", description: "Cấu trúc và mẫu luyện tập" },
    { key: "video", label: "Video", description: "Video đăng tải theo cấp độ" },
    { key: "speaking", label: "Speaking", description: "Hình ảnh, audio và script luyện nói" },
];

const CONTENT_FIELDS = {
    vocabulary: [
        { name: "image", label: "Ảnh/GIF", placeholder: "Tải ảnh/gif cho từ vựng", type: "file", fullWidth: true },
        { name: "word", label: "Từ", placeholder: "Ví dụ: taberu" },
        { name: "reading", label: "Cách đọc", placeholder: "Ví dụ: ta-be-ru" },
        { name: "meaning", label: "Nghĩa", placeholder: "Ví dụ: ăn" },
        { name: "example", label: "Ví dụ", placeholder: "Ví dụ: 田中(たなか)さんは 先生(せんせい）です → Anh/chị Tanaka là giáo viên", type: "textarea" },
    ],
    kanji: [
        { name: "kanji", label: "Kanji", placeholder: "Ví dụ: 学" },
        { name: "reading", label: "Cách đọc", placeholder: "Ví dụ: がく / まな.ぶ" },
        { name: "hanviet", label: "Hán Việt", placeholder: "Ví dụ: học" },
        { name: "onyomi", label: "Onyomi", placeholder: "Ví dụ: ガク" },
        { name: "kunyomi", label: "Kunyomi", placeholder: "Ví dụ: まな-ぶ" },
        { name: "meaning", label: "Nghĩa", placeholder: "Ví dụ: học" },
        { name: "example", label: "Ví dụ", placeholder: "Mỗi dòng: câu Nhật → nghĩa; hội thoại dùng |, ví dụ: A | B", type: "textarea" },
        { name: "drawingImage", label: "Ảnh nét vẽ", placeholder: "Tải ảnh/gif", type: "file", fullWidth: true },
        { name: "illustrationImage", label: "Ảnh minh họa", placeholder: "Tải ảnh/gif minh họa cho kanji", type: "file", fullWidth: true },
    ],
    grammar: [
        {
            name: "structure",
            label: "Cấu trúc",
            placeholder: "Ví dụ: Danh từ + wa + Danh từ",
            type: "textarea",
            hint: "Dùng ~text~ hoặc ~~text~~ để hiện phần bị gạch ngang, ví dụ ~~ます~~, ~~i~~, ~~na~~.",
        },
        { name: "meaning", label: "Ý nghĩa", placeholder: "Nghĩa tiếng Việt/Anh", type: "textarea" },
        { name: "usage", label: "Cách dùng", placeholder: "Khi nào sử dụng", type: "textarea" },
        { name: "notes", label: "Ghi chú", placeholder: "Ghi chú thêm", type: "textarea", fullWidth: true },
        {
            name: "tip",
            label: "Mẹo nhớ",
            placeholder: "Nhập mẹo giúp ghi nhớ mẫu ngữ pháp (có thể bỏ trống)",
            type: "textarea",
            fullWidth: true,
        },
        {
            name: "examples",
            label: "Ví dụ",
            placeholder: "Ví dụ: 田中(たなか)さんは 先生(せんせい)です → Anh Tanaka là giáo viên",
            type: "textarea",
            fullWidth: true,
            hint: "Nếu là hội thoại, ghi mỗi lượt trên một dòng theo dạng Người nói | Nội dung.",
        },
    ],
    reading: [
        { name: "title", label: "Tiêu đề", placeholder: "Tiêu đề bài đọc", fullWidth: true },
        {
            name: "content",
            label: "Nội dung (kanji)",
            placeholder: "Ví dụ: 田中(たなか)さんは 先生(せんせい)です",
            type: "textarea",
            fullWidth: true,
            hint: "Cách thêm chuẩn của 3 định dạng: 私は'カルロス'です | '6時'（ろくじ）はんにおきます。| 休 (やす) みの日.",
        },
        {
            name: "romaji",
            label: "Romaji",
            placeholder: "Ví dụ: Watashi wa Sakura desu.",
            type: "textarea",
            fullWidth: true,
        },
        { name: "translation", label: "Bản dịch", placeholder: "Bản dịch", type: "textarea", fullWidth: true },
    ],
    video: [
        { name: "title", label: "Tiêu đề video", placeholder: "Tiêu đề video" },
        { name: "youtubeVideoId", label: "ID video YouTube", placeholder: "Ví dụ: dQw4w9WgXcQ" },
    ],
    speaking: [
        { name: "title", label: "Tiêu đề", placeholder: "Tiêu đề bài speaking" },
        { name: "imageUrl", label: "URL hình ảnh", placeholder: "https://..." },
        { name: "audioUrl", label: "URL audio", placeholder: "https://.../audio.mp3" },
        { name: "script", label: "Script", placeholder: "Nhập script luyện nói", type: "textarea", fullWidth: true },
    ],
};

export function getModuleMeta(moduleKey) {
    return ADMIN_MODULES.find((moduleItem) => moduleItem.key === moduleKey) || {
        key: moduleKey,
        label: moduleKey,
        description: "",
    };
}

export function getContentFields(moduleKey) {
    return CONTENT_FIELDS[moduleKey] || CONTENT_FIELDS.vocabulary;
}

export function getContentColumns(moduleKey) {
    if (moduleKey === "vocabulary") {
        return ["Từ", "Cách đọc", "Nghĩa"];
    }

    if (moduleKey === "kanji") {
        return ["Kanji", "Onyomi", "Nghĩa"];
    }

    if (moduleKey === "grammar") {
        return ["Cấu trúc", "Ý nghĩa", "Cách dùng"];
    }

    if (moduleKey === "reading") {
        return ["Tiêu đề", "Độ dài", "Tóm tắt"];
    }

    if (moduleKey === "shadowing" || moduleKey === "video") {
        return ["Tiêu đề", "YouTube"];
    }

    if (moduleKey === "speaking") {
        return ["Tiêu đề", "Audio"];
    }

    return ["Trường 1", "Trường 2", "Trường 3"];
}

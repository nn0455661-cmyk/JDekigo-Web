import {
    createContentItem,
    deleteContentItem,
    findContentItemById,
    findContentItems,
    suggestDictionaryEntry,
    normalizeContentItem,
    updateContentItem,
} from "./content.repository";
import { AppError } from "@/server/utils/error";
import Lesson from "@/server/models/lesson.model";
import { connectMongo } from "@/server/lib/mongoose";
import { cleanupUnreferencedR2Media, collectR2ObjectKeys } from "@/server/lib/r2-media-cleanup";
import { deleteStagedR2Objects, promoteStagedR2Media } from "@/server/lib/r2-staged-media";

function getLessonIdValue(lessonId) {
    if (!lessonId) {
        return "";
    }

    if (typeof lessonId === "object" && lessonId._id) {
        return String(lessonId._id);
    }

    return String(lessonId);
}

function normalizeAudioProvider(provider) {
    const value = String(provider || "").trim();
    return value === "cloudinary" ? "" : value;
}

function normalizeSpeakingItem(item = {}) {
    return {
        ...item,
        audioProvider: normalizeAudioProvider(item.audioProvider),
    };
}

function serializeContentLesson(lesson) {
    return {
        id: String(lesson._id),
        lessonId: String(lesson._id),
        module: lesson.module,
        level: lesson.level || "",
        lessonOrder: lesson.lessonOrder,
        lessonTitle: lesson.lessonTitle || "",
        status: lesson.status,
    };
}

async function normalizeContentItemsWithLevel(items) {
    const normalizedItems = items.map(normalizeContentItem);
    const lessonIds = [...new Set(normalizedItems.map((item) => getLessonIdValue(item.lessonId)).filter(Boolean))];

    if (!lessonIds.length) {
        return normalizedItems.map((item) => ({
            ...item,
            lessonId: getLessonIdValue(item.lessonId),
            level: item.level || "",
            speakingItems: Array.isArray(item.speakingItems) ? item.speakingItems.map((child) => normalizeSpeakingItem(child)) : item.speakingItems,
            readingItems: Array.isArray(item.readingItems) ? item.readingItems.map((child) => normalizeSpeakingItem(child)) : item.readingItems,
            audioProvider: normalizeAudioProvider(item.audioProvider),
        }));
    }

    const lessons = await Lesson.find(
        { _id: { $in: lessonIds } },
        { level: 1, lessonOrder: 1, lessonTitle: 1 }
    ).lean().exec();
    const lessonMap = new Map(
        lessons.map((lesson) => [
            String(lesson._id),
            {
                level: lesson.level || "",
                lessonOrder: lesson.lessonOrder,
                lessonTitle: lesson.lessonTitle || "",
            },
        ])
    );

    return normalizedItems.map((item) => {
        const lessonId = getLessonIdValue(item.lessonId);

        const lessonMeta = lessonMap.get(lessonId);

        return {
            ...item,
            lessonId,
            level: lessonMeta?.level || item.level || "",
            lessonOrder: lessonMeta?.lessonOrder,
            lessonTitle: lessonMeta?.lessonTitle || "",
            speakingItems: Array.isArray(item.speakingItems) ? item.speakingItems.map((child) => normalizeSpeakingItem(child)) : item.speakingItems,
            readingItems: Array.isArray(item.readingItems) ? item.readingItems.map((child) => normalizeSpeakingItem(child)) : item.readingItems,
            audioProvider: normalizeAudioProvider(item.audioProvider),
        };
    });
}

function buildLessonContentPayload(moduleKey, input) {
    if (moduleKey === "grammar") {
        const examples = Array.from(
            new Map(
                String(input.examples || "")
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item) => {
                        const separatorMatch = item.match(/^(.*?)\s*(?:\||→|=>)\s*(.*)$/);
                        const jp = separatorMatch ? String(separatorMatch[1] || "").trim() : item;
                        const vi = separatorMatch ? String(separatorMatch[2] || "").trim() : item;
                        const dialogueSegments = vi.includes("|")
                            ? vi.split(/\s*\|\s*/).map((segment) => segment.trim()).filter(Boolean)
                            : [];

                        return [`${jp}|||${vi}`, { jp, vi, dialogueSegments }];
                    })
            ).values()
        );

        return {
            lessonId: input.lessonId,
            structure: input.structure,
            meaning: input.meaning,
            usage: input.usage,
            notes: input.notes,
            tip: String(input.tip || "").trim(),
            examples,
            status: input.status,
        };
    }

    if (moduleKey === "kanji") {
        return {
            lessonId: input.lessonId,
            kanji: input.kanji,
            reading: input.reading,
            hanviet: input.hanviet,
            onyomi: input.onyomi,
            kunyomi: input.kunyomi,
            meaning: input.meaning,
            example: input.example,
            illustrationImage: input.illustrationImage,
            drawingImage: input.drawingImage,
            status: input.status,
        };
    }

    if (moduleKey === "reading") {
        return {
            lessonId: input.lessonId,
            title: input.title,
            content: input.content,
            contentWithHiragana: input.contentWithHiragana,
            translation: input.translation,
            status: input.status,
        };
    }

    if (moduleKey === "shadowing" || moduleKey === "video") {
        return {
            lessonId: input.lessonId || null,
            level: input.level,
            title: input.title,
            youtubeVideoId: input.youtubeVideoId,
            status: input.status,
        };
    }

    if (moduleKey === "speaking") {
        return {
            level: input.level,
            title: input.title,
            setOrder: Number(input.setOrder) || 1,
            speakingItems: Array.isArray(input.speakingItems) ? input.speakingItems : [],
            readingItems: Array.isArray(input.readingItems) ? input.readingItems : [],
            imageUrl: input.imageUrl,
            audioAssetId: input.audioAssetId || "",
            audioPublicId: input.audioPublicId || "",
            audioProvider: input.audioProvider || "",
            audioUrl: input.audioUrl,
            script: input.script,
            scriptEnabled: input.scriptEnabled !== false,
            status: input.status,
        };
    }

    return {
        lessonId: input.lessonId,
        word: input.word,
        reading: input.reading,
        meaning: input.meaning,
        example: input.example,
        image: input.image,
        status: input.status,
    };
}

export async function fetchGrammarContent() {
    await connectMongo();
    const items = await findContentItems("grammar");
    return { data: await normalizeContentItemsWithLevel(items) };
}

export async function fetchVocabularyContent() {
    await connectMongo();
    const items = await findContentItems("vocabulary");
    return { data: await normalizeContentItemsWithLevel(items) };
}

export async function fetchKanjiContent() {
    await connectMongo();
    const items = await findContentItems("kanji");
    const lessons = await Lesson.find(
        { module: "kanji" },
        { module: 1, level: 1, lessonOrder: 1, lessonTitle: 1, status: 1 }
    ).sort({ lessonOrder: 1, createdAt: -1 }).lean().exec();

    return {
        data: await normalizeContentItemsWithLevel(items),
        lessons: lessons.map(serializeContentLesson),
    };
}

export async function fetchReadingContent() {
    await connectMongo();
    const items = await findContentItems("reading");
    return { data: await normalizeContentItemsWithLevel(items) };
}

export async function fetchDictionarySuggestion(term) {
    await connectMongo();
    return suggestDictionaryEntry(term);
}

export async function listAdminContent(moduleKey, lessonId) {
    await connectMongo();
    const items = await findContentItems(moduleKey, lessonId);
    return { items: await normalizeContentItemsWithLevel(items) };
}

export async function getAdminContentItem(moduleKey, id) {
    await connectMongo();
    const item = await findContentItemById(moduleKey, id);

    if (!item) {
        throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    const [normalized] = await normalizeContentItemsWithLevel([item]);
    return { item: normalized };
}

export async function createAdminContent(moduleKey, input) {
    await connectMongo();
    const staged = await promoteStagedR2Media(buildLessonContentPayload(moduleKey, input));

    try {
        const item = await createContentItem(moduleKey, staged.value);
        const [normalized] = await normalizeContentItemsWithLevel([item]);
        return { item: normalized };
    } catch (error) {
        await cleanupUnreferencedR2Media(staged.value);
        throw error;
    } finally {
        await deleteStagedR2Objects(staged.stagedKeys).catch((error) => {
            console.error("[r2-staging] Unable to remove temporary media", error);
        });
    }
}

export async function updateAdminContent(moduleKey, id, input) {
    await connectMongo();
    const current = await findContentItemById(moduleKey, id);

    if (!current) {
        throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    const staged = await promoteStagedR2Media(buildLessonContentPayload(moduleKey, input));
    let item;

    try {
        item = await updateContentItem(moduleKey, id, staged.value);
    } catch (error) {
        await cleanupUnreferencedR2Media(staged.value);
        throw error;
    } finally {
        await deleteStagedR2Objects(staged.stagedKeys).catch((error) => {
            console.error("[r2-staging] Unable to remove temporary media", error);
        });
    }

    if (!item) {
        throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    const nextMediaKeys = collectR2ObjectKeys(item);
    const removedMediaKeys = [...collectR2ObjectKeys(current)].filter((key) => !nextMediaKeys.has(key));
    await cleanupUnreferencedR2Media(removedMediaKeys);
    const [normalized] = await normalizeContentItemsWithLevel([item]);
    return { item: normalized };
}

export async function deleteAdminContent(moduleKey, id) {
    await connectMongo();
    const item = await deleteContentItem(moduleKey, id);

    if (!item) {
        throw new AppError("Content not found", 404, "CONTENT_NOT_FOUND");
    }

    const mediaCleanup = await cleanupUnreferencedR2Media(item);
    return { success: true, mediaCleanup };
}


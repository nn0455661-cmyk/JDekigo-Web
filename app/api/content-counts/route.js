import { connectMongo } from "@/server/lib/mongoose";
import Grammar from "@/server/models/grammar.model";
import Kanji from "@/server/models/kanji.model";
import Lesson from "@/server/models/lesson.model";
import Reading from "@/server/models/reading.model";
import Shadowing from "@/server/models/shadowing.model";
import Speaking from "@/server/models/speaking.model";
import Vocabulary from "@/server/models/vocabulary.model";
import { errorResponse, successResponse } from "@/server/utils/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_BY_MODULE = {
    grammar: Grammar,
    vocabulary: Vocabulary,
    kanji: Kanji,
    reading: Reading,
    speaking: Speaking,
    shadowing: Shadowing,
    video: Shadowing,
};

const DEFAULT_COUNTS = { JPD113: 0, JPD123: 0 };

function emptyStats() {
    return {
        counts: { ...DEFAULT_COUNTS },
        itemCounts: { ...DEFAULT_COUNTS },
    };
}

async function countDistinctLessonsByLevel(moduleKey) {
    const model = MODEL_BY_MODULE[moduleKey];
    const lessons = await Lesson.find({ module: moduleKey }, { level: 1 }).lean().exec();
    const lessonLevelById = new Map(lessons.map((lesson) => [String(lesson._id), String(lesson.level || "").toUpperCase()]));
    const lessonIds = lessons.map((lesson) => lesson._id);

    if (!lessonIds.length) {
        return emptyStats();
    }

    const rows = await model.aggregate([
        { $match: { lessonId: { $in: lessonIds } } },
        { $group: { _id: "$lessonId", total: { $sum: 1 } } },
    ]);

    return rows.reduce((stats, row) => {
        const level = lessonLevelById.get(String(row._id));
        if (level && stats.counts[level] !== undefined) {
            stats.counts[level] += 1;
            stats.itemCounts[level] += Number(row.total || 0);
        }
        return stats;
    }, emptyStats());
}

async function countKanjiLessonsByLevel() {
    const model = MODEL_BY_MODULE.kanji;
    const lessons = await Lesson.find({ module: "kanji" }, { level: 1 }).lean().exec();
    const lessonLevelById = new Map(lessons.map((lesson) => [String(lesson._id), String(lesson.level || "").toUpperCase()]));
    const lessonIds = lessons.map((lesson) => lesson._id);
    const stats = lessons.reduce((acc, lesson) => {
        const level = String(lesson.level || "").toUpperCase();
        if (level && acc.counts[level] !== undefined) {
            acc.counts[level] += 1;
        }
        return acc;
    }, emptyStats());

    if (!lessonIds.length) {
        return stats;
    }

    const rows = await model.aggregate([
        { $match: { lessonId: { $in: lessonIds } } },
        { $group: { _id: "$lessonId", total: { $sum: 1 } } },
    ]);

    return rows.reduce((stats, row) => {
        const level = lessonLevelById.get(String(row._id));
        if (level && stats.counts[level] !== undefined) {
            stats.itemCounts[level] += Number(row.total || 0);
        }
        return stats;
    }, stats);
}

async function countReadingByLevel() {
    const lessons = await Lesson.find({ module: "reading" }, { level: 1 }).lean().exec();
    const lessonLevelById = new Map(lessons.map((lesson) => [String(lesson._id), String(lesson.level || "").toUpperCase()]));
    const lessonIds = lessons.map((lesson) => lesson._id);

    if (!lessonIds.length) {
        return emptyStats();
    }

    const rows = await Reading.aggregate([
        { $match: { lessonId: { $in: lessonIds } } },
        { $group: { _id: "$lessonId", total: { $sum: 1 } } },
    ]);

    return rows.reduce((stats, row) => {
        const level = lessonLevelById.get(String(row._id));
        if (level && stats.counts[level] !== undefined) {
            const total = Number(row.total || 0);
            stats.counts[level] += 1;
            stats.itemCounts[level] += total;
        }
        return stats;
    }, emptyStats());
}

async function countSpeakingByLevel() {
    const sets = await Speaking.find({ status: "published" }, { level: 1, speakingItems: 1, readingItems: 1, audioUrl: 1 }).lean().exec();

    const initialStats = emptyStats();
    initialStats.speakingItems = { ...DEFAULT_COUNTS };
    initialStats.readingItems = { ...DEFAULT_COUNTS };

    return sets.reduce((stats, set) => {
        const level = String(set.level || "").trim().toUpperCase();
        if (level && stats.counts[level] !== undefined) {
            const speakingCount = Array.isArray(set.speakingItems) && set.speakingItems.length ? set.speakingItems.length : set.audioUrl ? 1 : 0;
            const readingCount = Array.isArray(set.readingItems) ? set.readingItems.length : 0;
            const total = speakingCount + readingCount;
            
            stats.counts[level] += 1; 
            stats.itemCounts[level] += total; 
            stats.speakingItems[level] += speakingCount;
            stats.readingItems[level] += readingCount;
        }
        return stats;
    }, initialStats);
}

async function countShadowingByLevel() {
    const items = await Shadowing.find({}, { level: 1 }).lean().exec();
    
    return items.reduce((stats, item) => {
        const level = String(item.level || "").trim().toUpperCase();
        if (level && stats.counts[level] !== undefined) {
            stats.counts[level] += 1;
            stats.itemCounts[level] += 1;
        }
        return stats;
    }, emptyStats());
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const moduleKey = String(searchParams.get("module") || "").trim();

        if (!MODEL_BY_MODULE[moduleKey]) {
            return successResponse(emptyStats());
        }

        await connectMongo();

        if (moduleKey === "kanji") {
            return successResponse(await countKanjiLessonsByLevel());
        }

        if (moduleKey === "speaking") {
            return successResponse(await countSpeakingByLevel());
        }

        if (moduleKey === "reading") {
            return successResponse(await countReadingByLevel());
        }

        if (moduleKey === "shadowing" || moduleKey === "video") {
            return successResponse(await countShadowingByLevel());
        }

        return successResponse(await countDistinctLessonsByLevel(moduleKey));
    } catch (error) {
        return errorResponse(error);
    }
}

import { connectMongo } from "@/server/lib/mongoose";
import { AppError } from "@/server/utils/error";
import { createLesson, deleteLessonById, findLessonById, findLessons, updateLessonById } from "./lesson.repository";

// Models to delete associated items
import Vocabulary from "@/server/models/vocabulary.model";
import Kanji from "@/server/models/kanji.model";
import Grammar from "@/server/models/grammar.model";
import Reading from "@/server/models/reading.model";
import Shadowing from "@/server/models/shadowing.model";
import Speaking from "@/server/models/speaking.model";
import Test from "@/server/models/test.model";
import { cleanupUnreferencedR2Media } from "@/server/lib/r2-media-cleanup";

function serializeLesson(lesson) {
    return {
        id: String(lesson._id),
        module: lesson.module,
        level: lesson.level,
        lessonTitle: lesson.lessonTitle,
        lessonOrder: lesson.lessonOrder,
        status: lesson.status,
        createdAt: lesson.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: lesson.updatedAt?.toISOString?.() || new Date().toISOString(),
        updatedAtISO: lesson.updatedAt?.toISOString?.().slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
}

export async function listAdminLessons(input) {
    await connectMongo();

    const query = {
        level: String(input.level || "").toUpperCase(),
        module: input.module,
        ...(input.status ? { status: input.status } : {}),
    };

    const items = await findLessons(query);
    return { items: items.map(serializeLesson), query };
}

export async function getAdminLesson(id) {
    await connectMongo();

    const lesson = await findLessonById(id);

    if (!lesson) {
        throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    return { item: serializeLesson(lesson) };
}

export async function createAdminLesson(input) {
    await connectMongo();

    const lesson = await createLesson({
        ...input,
        level: String(input.level || "").toUpperCase(),
    });

    return { item: serializeLesson(lesson) };
}

export async function updateAdminLesson(id, input) {
    await connectMongo();

    const lesson = await updateLessonById(id, {
        ...input,
        ...(input.level ? { level: String(input.level).toUpperCase() } : {}),
    });

    if (!lesson) {
        throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    return { item: serializeLesson(lesson) };
}

export async function deleteAdminLesson(id) {
    await connectMongo();

    const relatedDocuments = await Promise.all([
        Vocabulary.find({ lessonId: id }).lean().exec(),
        Kanji.find({ lessonId: id }).lean().exec(),
        Grammar.find({ lessonId: id }).lean().exec(),
        Reading.find({ lessonId: id }).lean().exec(),
        Shadowing.find({ lessonId: id }).lean().exec(),
        Speaking.find({ lessonId: id }).lean().exec(),
        Test.find({ lessonId: id }).lean().exec(),
    ]);

    const deleted = await deleteLessonById(id);

    if (!deleted) {
        throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    // Xóa các module / bài kiểm tra liên quan
    await Promise.all([
        Vocabulary.deleteMany({ lessonId: id }),
        Kanji.deleteMany({ lessonId: id }),
        Grammar.deleteMany({ lessonId: id }),
        Reading.deleteMany({ lessonId: id }),
        Shadowing.deleteMany({ lessonId: id }),
        Speaking.deleteMany({ lessonId: id }),
        Test.deleteMany({ lessonId: id }),
    ]);

    const mediaCleanup = await cleanupUnreferencedR2Media(relatedDocuments);
    return { success: true, mediaCleanup };
}

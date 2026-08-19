import { z } from "zod";

export const LESSON_MODULES = ["vocabulary", "kanji", "grammar", "reading", "shadowing", "video", "speaking"];

export const listLessonsQuerySchema = z.object({
    level: z.string().trim().min(1).max(20),
    module: z.enum(LESSON_MODULES),
    status: z.enum(["draft", "published"]).optional(),
});

export const lessonSchema = z.object({
    module: z.enum(LESSON_MODULES),
    level: z.string().trim().min(1).max(20),
    lessonTitle: z.string().trim().min(1),
    lessonOrder: z.coerce.number().int().min(1),
    status: z.enum(["draft", "published"]).default("draft"),
});

export const updateLessonSchema = z.object({
    module: z.enum(LESSON_MODULES).optional(),
    level: z.string().trim().min(1).max(20).optional(),
    lessonTitle: z.string().trim().min(1).optional(),
    lessonOrder: z.coerce.number().int().min(1).optional(),
    status: z.enum(["draft", "published"]).optional(),
});

import { z } from "zod";

export const TEST_MODULES = ["vocabulary", "kanji", "grammar", "reading", "shadowing", "video", "speaking", "mock_test"];
export const TEST_KINDS = ["lesson_test", "mini_practice", "module_exam"];
export const TEST_SCOPE_TYPES = ["lesson", "level", "module"];

export const testQuestionSchema = z.object({
    type: z.enum(["multiple_choice", "arrangement", "listening", "arrange", "fill", "reading_comprehension"]),
    question: z.string().trim().optional().or(z.literal("")),
    prompt: z.string().trim().optional().or(z.literal("")),
    passage: z.string().trim().optional().or(z.literal("")),
    formulaWithBlank: z.string().trim().optional().or(z.literal("")),
    options: z.array(z.string().trim()).default([]),
    correctAnswer: z.string().trim().optional().or(z.literal("")),
    correctSentence: z.string().trim().optional().or(z.literal("")),
    pieces: z.array(
        z.object({
            id: z.string().trim().optional().or(z.literal("")),
            text: z.string().trim(),
        })
    ).default([]),
    reading: z.string().trim().optional().or(z.literal("")),
    explanation: z.string().trim().optional().or(z.literal("")),
});

function hasMeaningfulText(value) {
    return String(value || "").trim().length > 0;
}

function hasFourOptions(options = []) {
    return Array.isArray(options) && options.length === 4 && options.every((option) => hasMeaningfulText(option));
}

function hasPieces(pieces = []) {
    return Array.isArray(pieces) && pieces.length > 1 && pieces.every((piece) => hasMeaningfulText(piece?.text));
}

const testBaseSchema = z.object({
    testTitle: z.string().trim().min(1),
    level: z.string().trim().min(1).max(20),
    lessonId: z.string().trim().min(1).optional().or(z.literal("")),
    module: z.enum(TEST_MODULES),
    testKind: z.enum(TEST_KINDS),
    scopeType: z.enum(TEST_SCOPE_TYPES),
    miniTestGroupId: z.string().trim().optional().or(z.literal("")),
    timeLimit: z.coerce.number().int().min(0).default(0),
    status: z.enum(["draft", "published"]).default("draft"),
    questions: z.array(testQuestionSchema).min(1),
});

function validateTestPayload(value, context) {
    const isMiniGroupExam = value.testKind === "module_exam" && Boolean(value.miniTestGroupId);

    if (value.testKind === "lesson_test" && !value.lessonId) {
        context.addIssue({ code: "custom", path: ["lessonId"], message: "lessonId is required" });
    }

    if (value.testKind === "mini_practice" && value.module !== "mock_test" && !value.lessonId) {
        context.addIssue({ code: "custom", path: ["lessonId"], message: "lessonId is required" });
    }

    if (value.testKind === "mini_practice" && value.module !== "mock_test" && value.scopeType !== "lesson") {
        context.addIssue({ code: "custom", path: ["scopeType"], message: "mini_practice must use scopeType lesson" });
    }

    if (value.testKind === "mini_practice" && value.module === "mock_test") {
        context.addIssue({ code: "custom", path: ["testKind"], message: "mock test mini group must use module_exam" });
    }

    if (value.testKind === "module_exam" && value.module !== "mock_test") {
        context.addIssue({ code: "custom", path: ["module"], message: "module_exam must use mock_test" });
    }

    if (value.testKind === "module_exam" && value.scopeType !== "level") {
        context.addIssue({ code: "custom", path: ["scopeType"], message: "module_exam must use scopeType level" });
    }

    if (value.testKind === "module_exam" && value.lessonId) {
        context.addIssue({ code: "custom", path: ["lessonId"], message: "module_exam must not attach lessonId" });
    }

    if (isMiniGroupExam && value.timeLimit < 1) {
        context.addIssue({ code: "custom", path: ["timeLimit"], message: "timeLimit is required" });
    }

    value.questions.forEach((question, index) => {
        const questionPath = ["questions", index];

        if (question.type === "arrange" || question.type === "arrangement") {
            if (!hasMeaningfulText(question.correctSentence || question.correctAnswer)) {
                context.addIssue({ code: "custom", path: [...questionPath, "correctSentence"], message: "correctSentence is required" });
            }

            if (!hasPieces(question.pieces)) {
                context.addIssue({ code: "custom", path: [...questionPath, "pieces"], message: "pieces are required" });
            }

            return;
        }

        if (question.type === "fill") {
            if (!hasMeaningfulText(question.formulaWithBlank || question.question)) {
                context.addIssue({ code: "custom", path: [...questionPath, "formulaWithBlank"], message: "formulaWithBlank is required" });
            }

            if (!hasFourOptions(question.options)) {
                context.addIssue({ code: "custom", path: [...questionPath, "options"], message: "options must contain 4 answers" });
            }

            if (!hasMeaningfulText(question.correctAnswer)) {
                context.addIssue({ code: "custom", path: [...questionPath, "correctAnswer"], message: "correctAnswer is required" });
            }

            return;
        }

        if (question.type === "multiple_choice" || question.type === "listening") {
            if (!hasMeaningfulText(question.question)) {
                context.addIssue({ code: "custom", path: [...questionPath, "question"], message: "question is required" });
            }

            if (!hasFourOptions(question.options)) {
                context.addIssue({ code: "custom", path: [...questionPath, "options"], message: "options must contain 4 answers" });
            }

            if (!hasMeaningfulText(question.correctAnswer)) {
                context.addIssue({ code: "custom", path: [...questionPath, "correctAnswer"], message: "correctAnswer is required" });
            }
        }
    });

    if (value.testKind === "mini_practice") {
        const totalQuestions = Array.isArray(value.questions) ? value.questions.length : 0;
        if (totalQuestions < 15 || totalQuestions > 30) {
            context.addIssue({ code: "custom", path: ["questions"], message: "mini_practice requires from 15 to 30 questions" });
        }
    }

    if (isMiniGroupExam) {
        const totalQuestions = Array.isArray(value.questions) ? value.questions.length : 0;
        if (totalQuestions < 15 || totalQuestions > 30) {
            context.addIssue({ code: "custom", path: ["questions"], message: "mini group module_exam requires from 15 to 30 questions" });
        }
    }

}

export const createTestSchema = testBaseSchema.superRefine(validateTestPayload);

export const updateTestSchema = z.object({
    testTitle: z.string().trim().min(1).optional(),
    level: z.string().trim().min(1).max(20).optional(),
    lessonId: z.string().trim().min(1).optional().or(z.literal("")).optional(),
    module: z.enum(TEST_MODULES).optional(),
    testKind: z.enum(TEST_KINDS).optional(),
    scopeType: z.enum(TEST_SCOPE_TYPES).optional(),
    miniTestGroupId: z.string().trim().optional().or(z.literal("")).optional(),
    timeLimit: z.coerce.number().int().min(0).optional(),
    status: z.enum(["draft", "published"]).optional(),
    questions: z.array(testQuestionSchema).optional(),
});

export const listTestsQuerySchema = z
    .object({
        id: z.string().trim().min(1).optional(),
        level: z.string().trim().min(1).max(20).optional(),
        module: z.enum(TEST_MODULES).optional(),
        testKind: z.enum(TEST_KINDS).optional(),
        scopeType: z.enum(TEST_SCOPE_TYPES).optional(),
        lessonId: z.string().trim().min(1).optional(),
        miniTestGroupId: z.string().trim().min(1).optional(),
        status: z.enum(["draft", "published"]).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .refine((value) => Boolean(value.id) || Boolean(value.level), {
        message: "Either id or level is required",
    });

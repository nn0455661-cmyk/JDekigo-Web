import { z } from "zod";

export const createHistorySchema = z.object({
    module: z.enum(["vocabulary", "kanji", "grammar", "reading", "mock-test"]),
    level: z.string().min(1, "Level is required"),
    testId: z.string().min(1, "TestId is required"),
    testTitle: z.string().optional(),
    type: z.string().optional(),
    mockTestType: z.enum(["full", "mini"]).optional(),
    testKind: z.string().optional(),
    miniTestGroupId: z.string().optional(),
    correct: z.number().optional(),
    total: z.number().optional(),
    percentage: z.number().optional(),
    durationSeconds: z.number().optional(),
    questions: z.any().optional(),
    answers: z.any().optional(),
});

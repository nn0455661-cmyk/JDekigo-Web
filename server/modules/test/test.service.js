import mongoose from "mongoose";
import { connectMongo } from "@/server/lib/mongoose";
import { AppError } from "@/server/utils/error";
import { createTest, deleteTestById, findTestById, updateTestById } from "./test.repository";
import Test from "@/server/models/test.model";
import { createTestSchema, updateTestSchema } from "./test.validation";
import { cleanupUnreferencedR2Media } from "@/server/lib/r2-media-cleanup";

function serializeQuestion(question) {
    return {
        ...question,
        id: String(question._id || question.id || ""),
    };
}

function serializeTest(test) {
    const totalQuestions = Array.isArray(test.questions) ? test.questions.length : 0;

    return {
        id: String(test._id),
        testTitle: test.testTitle,
        level: test.level,
        lessonId: test.lessonId ? String(test.lessonId) : "",
        module: test.module,
        testKind: test.testKind,
        scopeType: test.scopeType,
        miniTestGroupId: test.miniTestGroupId ? String(test.miniTestGroupId) : "",
        timeLimit: test.timeLimit || 0,
        status: test.status,
        totalQuestions,
        questions: Array.isArray(test.questions) ? test.questions.map(serializeQuestion) : [],
        createdAt: test.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: test.updatedAt?.toISOString?.() || new Date().toISOString(),
        updatedAtISO: test.updatedAt?.toISOString?.().slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
}

function buildAutoFilters(input) {
    const next = {
        level: String(input.level || "").toUpperCase(),
        ...(input.status ? { status: input.status } : {}),
        ...(input.module ? { module: input.module } : {}),
        ...(input.testKind ? { testKind: input.testKind } : {}),
        ...(input.scopeType ? { scopeType: input.scopeType } : {}),
        ...(input.miniTestGroupId ? { miniTestGroupId: input.miniTestGroupId } : {}),
    };

    if (input.lessonId) {
        const lessonIdValue = String(input.lessonId);
        if (mongoose.Types.ObjectId.isValid(lessonIdValue)) {
            next.lessonId = { $in: [new mongoose.Types.ObjectId(lessonIdValue), lessonIdValue] };
        } else {
            next.lessonId = lessonIdValue;
        }
    }

    if (!next.testKind) {
        if (next.module === "mock_test") {
            next.testKind = "module_exam";
        } else if (next.module) {
            next.testKind = "mini_practice";
        }
    }

    if (!next.scopeType) {
        if (next.testKind === "module_exam") {
            next.scopeType = "level";
        }
    }

    return next;
}

export async function getTests(input) {
    await connectMongo();

    if (input.id) {
        if (!mongoose.Types.ObjectId.isValid(input.id)) {
            throw new AppError("Invalid test id", 400, "INVALID_TEST_ID");
        }

        const found = await findTestById(input.id, input.status);
        if (!found) {
            throw new AppError("Test not found", 404, "TEST_NOT_FOUND");
        }

        return { item: serializeTest(found) };
    }

    const query = buildAutoFilters(input);

    // Directly query the model here to avoid potential issues with optional limit handling
    const rawItems = await Test.find(query).sort({ createdAt: -1 }).lean().exec();

    return { items: rawItems.map(serializeTest), query };
}

export async function getTestById(id) {
    await connectMongo();

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid test id", 400, "INVALID_TEST_ID");
    }

    const found = await findTestById(id);

    if (!found) {
        throw new AppError("Test not found", 404, "TEST_NOT_FOUND");
    }

    return { item: serializeTest(found) };
}

export async function createAdminTest(input) {
    await connectMongo();
    const payload = createTestSchema.parse(input);
    const test = await createTest({
        ...payload,
        level: String(payload.level || "").toUpperCase(),
        lessonId: payload.lessonId || null,
        miniTestGroupId: payload.miniTestGroupId || null,
    });

    return { item: serializeTest(test) };
}

export async function updateAdminTest(id, input) {
    await connectMongo();
    const payload = updateTestSchema.parse(input);
    const current = await findTestById(id);

    if (!current) {
        throw new AppError("Test not found", 404, "TEST_NOT_FOUND");
    }

    const validated = createTestSchema.parse({
        ...serializeTest(current),
        ...payload,
    });

    const test = await updateTestById(id, {
        ...validated,
        level: String(validated.level || "").toUpperCase(),
        lessonId: validated.lessonId || null,
        miniTestGroupId: validated.miniTestGroupId || null,
    });

    if (!test) {
        throw new AppError("Test not found", 404, "TEST_NOT_FOUND");
    }

    return { item: serializeTest(test) };
}

export async function deleteAdminTest(id) {
    await connectMongo();
    const deleted = await deleteTestById(id);

    if (!deleted) {
        throw new AppError("Test not found", 404, "TEST_NOT_FOUND");
    }

    const mediaCleanup = await cleanupUnreferencedR2Media(deleted);
    return { success: true, mediaCleanup };
}

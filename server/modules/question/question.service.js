import { connectMongo } from "@/server/lib/mongoose";
import { AppError } from "@/server/utils/error";
import {
    findQuestions,
    findQuestionById,
    createQuestion,
    updateQuestionById,
    deleteQuestionById,
} from "./question.repository";

export async function getQuestions(input = {}) {
    await connectMongo();

    const filters = {};
    if (input.level) filters.level = String(input.level || "").toUpperCase();
    if (input.module) filters.module = input.module;
    if (input.status) filters.status = input.status;
    if (input.category) {
        const category = String(input.category);
        if (category === "reading") {
            filters.$or = [
                { category: "reading" },
                { category: { $exists: false }, type: "reading_comprehension" },
            ];
        } else if (category === "vocabulary") {
            filters.$or = [
                { category: "vocabulary" },
                { category: { $exists: false }, type: { $ne: "reading_comprehension" } },
            ];
        } else {
            filters.category = category;
        }
    }

    const limit = Number(input.limit || 10);
    const page = Number(input.page || 1);
    const opts = { random: input.random === "true" || input.random === true };

    const result = await findQuestions(filters, limit, page, opts);
    return {
        items: result.items.map((i) => ({ ...i, id: String(i._id) })),
        total: result.total,
        page,
        limit,
    };
}

export async function getQuestionById(id) {
    await connectMongo();

    const found = await findQuestionById(id);
    if (!found) {
        throw new AppError("Question not found", 404, "QUESTION_NOT_FOUND");
    }

    return { item: { ...found, id: String(found._id) } };
}

export async function createAdminQuestion(input) {
    await connectMongo();

    const created = await createQuestion({
        ...input,
        category: input.type === "reading_comprehension" ? "reading" : input.category,
        level: String(input.level || "").toUpperCase(),
    });

    return { item: { ...created.toObject(), id: String(created._id) } };
}

export async function updateAdminQuestion(id, input) {
    await connectMongo();

    const current = await findQuestionById(id);
    if (!current) {
        throw new AppError("Question not found", 404, "QUESTION_NOT_FOUND");
    }

    const updated = await updateQuestionById(id, {
        ...input,
        category: input.type === "reading_comprehension" ? "reading" : input.category,
        level: input.level ? String(input.level).toUpperCase() : current.level,
    });

    if (!updated) {
        throw new AppError("Question not found", 404, "QUESTION_NOT_FOUND");
    }

    return { item: { ...updated, id: String(updated._id) } };
}

export async function deleteAdminQuestion(id) {
    await connectMongo();

    const deleted = await deleteQuestionById(id);
    if (!deleted) {
        throw new AppError("Question not found", 404, "QUESTION_NOT_FOUND");
    }

    return { success: true };
}

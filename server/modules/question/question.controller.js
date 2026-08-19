import { errorResponse, successResponse } from "@/server/utils/response";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import {
    getQuestions,
    getQuestionById,
    createAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
} from "./question.service";

export async function listQuestions(request) {
    try {
        const { searchParams } = new URL(request.url);
        const params = Object.fromEntries(searchParams.entries());
        const includeDrafts = params.includeDrafts === "true";
        delete params.includeDrafts;

        if (includeDrafts) {
            await requireAdmin(request);
        } else {
            params.status = "published";
        }

        const data = await getQuestions(params);
        return successResponse(data);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function readQuestion(request, id) {
    try {
        await requireAdmin(request);
        return successResponse(await getQuestionById(id));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function createQuestionHandler(request) {
    try {
        await requireAdmin(request);
        const payload = await request.json();
        return successResponse(await createAdminQuestion(payload), 201);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function updateQuestionHandler(request, id) {
    try {
        await requireAdmin(request);
        const payload = await request.json();
        return successResponse(await updateAdminQuestion(id, payload));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function deleteQuestionHandler(request, id) {
    try {
        await requireAdmin(request);
        return successResponse(await deleteAdminQuestion(id));
    } catch (error) {
        return errorResponse(error);
    }
}

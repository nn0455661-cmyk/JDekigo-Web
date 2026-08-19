import { errorResponse, successResponse } from "@/server/utils/response";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { createAdminLesson, deleteAdminLesson, getAdminLesson, listAdminLessons, updateAdminLesson } from "./lesson.service";
import { lessonSchema, listLessonsQuerySchema, updateLessonSchema } from "./lesson.validation";

export async function listLessons(request) {
    try {
        await requireAdmin(request);
        const { searchParams } = new URL(request.url);
        const payload = listLessonsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
        return successResponse(await listAdminLessons(payload));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function getLesson(request, id) {
    try {
        await requireAdmin(request);
        return successResponse(await getAdminLesson(id));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function createLessonHandler(request) {
    try {
        await requireAdmin(request);
        const payload = lessonSchema.parse(await request.json());
        return successResponse(await createAdminLesson(payload), 201);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function updateLessonHandler(request, id) {
    try {
        await requireAdmin(request);
        const payload = updateLessonSchema.parse(await request.json());
        return successResponse(await updateAdminLesson(id, payload));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function deleteLessonHandler(request, id) {
    try {
        await requireAdmin(request);
        return successResponse(await deleteAdminLesson(id));
    } catch (error) {
        return errorResponse(error);
    }
}
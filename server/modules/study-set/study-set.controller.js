import { AppError } from "@/server/utils/error";
import { errorResponse, successResponse } from "@/server/utils/response";
import { requireAuth } from "@/server/middlewares/auth.middleware";
import { createUserStudySet, deleteUserStudySet, fetchUserStudySets, updateUserStudySet } from "./study-set.service";
import { createStudySetSchema, updateStudySetSchema } from "./study-set.validation";

export async function listStudySets(request) {
    try {
        const auth = await requireAuth(request);
        return successResponse(await fetchUserStudySets(auth.userId));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function createStudySetHandler(request) {
    try {
        const auth = await requireAuth(request);
        const body = createStudySetSchema.parse(await request.json());

        return successResponse(await createUserStudySet(auth.userId, body), 201);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function updateStudySetHandler(request, studySetId) {
    try {
        const auth = await requireAuth(request);
        const body = updateStudySetSchema.parse(await request.json());

        if (!studySetId) {
            throw new AppError("Missing study set id", 400, "STUDY_SET_ID_REQUIRED");
        }

        return successResponse(await updateUserStudySet(auth.userId, studySetId, body));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function deleteStudySetHandler(request, studySetId) {
    try {
        const auth = await requireAuth(request);

        if (!studySetId) {
            throw new AppError("Missing study set id", 400, "STUDY_SET_ID_REQUIRED");
        }

        return successResponse(await deleteUserStudySet(auth.userId, studySetId));
    } catch (error) {
        return errorResponse(error);
    }
}

import { errorResponse, successResponse } from "@/server/utils/response";
import { requireAuth } from "@/server/middlewares/auth.middleware";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { changeCurrentUserPassword, getCurrentUser, updateCurrentUserProfile, getAdminUsers, changeUserRole } from "./user.service";
import { changePasswordSchema, updateProfileSchema } from "./user.validation";

export async function me(request) {
    try {
        const auth = await requireAuth(request);
        const user = await getCurrentUser(auth.userId);

        return successResponse({ user });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function updateMe(request) {
    try {
        const auth = await requireAuth(request);
        const body = updateProfileSchema.parse(await request.json());
        const user = await updateCurrentUserProfile(auth.userId, body);

        return successResponse({ user });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function changePassword(request) {
    try {
        const auth = await requireAuth(request);
        const body = changePasswordSchema.parse(await request.json());
        const user = await changeCurrentUserPassword(auth.userId, body);

        return successResponse({ user });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function getUsersForAdmin(request) {
    try {
        const auth = await requireAdmin(request);

        const { searchParams } = new URL(request.url);
        const queryParams = {
            page: searchParams.get("page") || 1,
            limit: searchParams.get("limit") || 10,
            search: searchParams.get("search") || "",
            role: searchParams.get("role") || "",
        };

        const result = await getAdminUsers(auth.userId, queryParams);

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function updateUserRole(request, { params }) {
    try {
        const auth = await requireAdmin(request);

        const body = await request.json();
        const { role } = body;
        const { id } = params;

        const result = await changeUserRole(auth.userId, id, role);

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

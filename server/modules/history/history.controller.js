import { errorResponse, successResponse } from "@/server/utils/response";
import { requireAuth } from "@/server/middlewares/auth.middleware";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { AppError } from "@/server/utils/error";
import { createHistoryRecord, getAdminStatisticsOverview, getAdminUserHistory, getUserHistory } from "./history.service";
import { createHistorySchema } from "./history.validation";

export async function createHistory(request) {
    try {
        const auth = await requireAuth(request);
        const body = createHistorySchema.parse(await request.json());
        const record = await createHistoryRecord(auth.userId, body);

        return successResponse({ record }, 201);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function getHistory(request) {
    try {
        const auth = await requireAuth(request);
        const { searchParams } = new URL(request.url);
        
        const queryParams = {
            module: searchParams.get("module") || "",
            level: searchParams.get("level") || "",
            page: searchParams.get("page") || 1,
            limit: searchParams.get("limit") || 100, // Fetch up to 100 recent
        };

        const result = await getUserHistory(auth.userId, queryParams);

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function getHistoryForAdminUser(request, { params }) {
    try {
        await requireAdmin(request);
        const { searchParams } = new URL(request.url);

        const queryParams = {
            module: searchParams.get("module") || "",
            level: searchParams.get("level") || "",
            page: searchParams.get("page") || 1,
            limit: searchParams.get("limit") || 100,
        };

        const result = await getAdminUserHistory(params.id, queryParams);

        if (!result) {
            throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
        }

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function getStatisticsOverviewForAdmin(request) {
    try {
        await requireAdmin(request);
        const { searchParams } = new URL(request.url);
        const result = await getAdminStatisticsOverview({
            date: searchParams.get("date") || "",
        });

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

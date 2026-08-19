import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { errorResponse, successResponse } from "@/server/utils/response";
import { createAdminContent, listAdminContent } from "@/server/modules/content/content.service";
import { AppError } from "@/server/utils/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        await requireAdmin(request);
        const { searchParams } = new URL(request.url);
        const moduleKey = String(searchParams.get("module") || "").trim();
        const lessonId = String(searchParams.get("lessonId") || "").trim();

        if (!moduleKey) {
            throw new AppError("Missing module", 400, "MODULE_REQUIRED");
        }

        return successResponse(await listAdminContent(moduleKey, lessonId || undefined));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request) {
    try {
        await requireAdmin(request);
        const body = await request.json();

        if (!body?.module) {
            throw new AppError("Missing module", 400, "MODULE_REQUIRED");
        }

        return successResponse(await createAdminContent(body.module, body), 201);
    } catch (error) {
        return errorResponse(error);
    }
}
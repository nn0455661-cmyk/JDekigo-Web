import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { errorResponse, successResponse } from "@/server/utils/response";
import { AppError } from "@/server/utils/error";
import { deleteAdminContent, getAdminContentItem, updateAdminContent } from "@/server/modules/content/content.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readModule(request) {
    const url = new URL(request.url);
    return String(url.searchParams.get("module") || "").trim();
}

export async function GET(request, props) {
    const params = await props.params;
    try {
        await requireAdmin(request);
        const moduleKey = readModule(request);

        if (!moduleKey) {
            throw new AppError("Missing module", 400, "MODULE_REQUIRED");
        }

        return successResponse(await getAdminContentItem(moduleKey, params?.id));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(request, props) {
    const params = await props.params;
    try {
        await requireAdmin(request);
        const body = await request.json();

        if (!body?.module) {
            throw new AppError("Missing module", 400, "MODULE_REQUIRED");
        }

        return successResponse(await updateAdminContent(body.module, params?.id, body));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        await requireAdmin(request);
        const moduleKey = readModule(request);

        if (!moduleKey) {
            throw new AppError("Missing module", 400, "MODULE_REQUIRED");
        }

        return successResponse(await deleteAdminContent(moduleKey, params?.id));
    } catch (error) {
        return errorResponse(error);
    }
}
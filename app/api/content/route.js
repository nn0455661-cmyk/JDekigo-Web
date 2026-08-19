import { errorResponse, successResponse } from "@/server/utils/response";
import { listAdminContent } from "@/server/modules/content/content.service";
import { AppError } from "@/server/utils/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const moduleKey = String(searchParams.get("module") || "").trim();
        const level = String(searchParams.get("level") || "").trim().toUpperCase();

        if (!moduleKey) {
            throw new AppError("Missing module", 400, "MODULE_REQUIRED");
        }

        const res = await listAdminContent(moduleKey);
        let items = Array.isArray(res.items) ? res.items : [];

        // Only expose published items to public API
        items = items.filter((it) => it.status === "published");

        if (level) {
            items = items.filter((it) => {
                const itemLevel = String(it.level || "").trim().toUpperCase();

                if (moduleKey === "video" && !itemLevel) {
                    return true;
                }

                return itemLevel === level;
            });
        }

        const response = successResponse({ items });
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        return response;
    } catch (error) {
        return errorResponse(error);
    }
}

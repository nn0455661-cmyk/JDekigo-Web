import { getHistoryForAdminUser } from "@/server/modules/history/history.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
    const params = await context.params;
    return getHistoryForAdminUser(request, { params });
}

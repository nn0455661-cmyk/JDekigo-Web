import { getStatisticsOverviewForAdmin } from "@/server/modules/history/history.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    return getStatisticsOverviewForAdmin(request);
}

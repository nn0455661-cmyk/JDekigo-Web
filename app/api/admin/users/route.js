import { getUsersForAdmin } from "@/server/modules/user/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    return getUsersForAdmin(request);
}

import { changePassword } from "@/server/modules/user/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
    return changePassword(request);
}

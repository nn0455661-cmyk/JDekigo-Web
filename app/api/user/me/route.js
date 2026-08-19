import { me, updateMe } from "@/server/modules/user/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    return me(request);
}

export async function PATCH(request) {
    return updateMe(request);
}


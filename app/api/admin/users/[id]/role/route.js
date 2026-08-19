import { updateUserRole } from "@/server/modules/user/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
    const params = await context.params;
    return updateUserRole(request, { params });
}

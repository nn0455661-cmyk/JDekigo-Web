import { register } from "@/server/modules/auth/auth.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
    return register(request);
}

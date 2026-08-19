import { reading } from "@/server/modules/content/content.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return reading();
}

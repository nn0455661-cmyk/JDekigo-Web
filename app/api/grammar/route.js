import { grammar } from "@/server/modules/content/content.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return grammar();
}

import { createTestHandler, listTests } from "@/server/modules/test/test.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    return listTests(request);
}

export async function POST(request) {
    return createTestHandler(request);
}

import { createHistory, getHistory } from "@/server/modules/history/history.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
    return createHistory(request);
}

export async function GET(request) {
    return getHistory(request);
}

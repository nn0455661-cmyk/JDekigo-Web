import { createStudySetHandler, listStudySets } from "@/server/modules/study-set/study-set.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    return listStudySets(request);
}

export async function POST(request) {
    return createStudySetHandler(request);
}
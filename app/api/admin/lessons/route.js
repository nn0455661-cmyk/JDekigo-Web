import { createLessonHandler, listLessons } from "@/server/modules/lesson/lesson.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
    return listLessons(request);
}

export async function POST(request) {
    return createLessonHandler(request);
}
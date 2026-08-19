import { deleteLessonHandler, getLesson, updateLessonHandler } from "@/server/modules/lesson/lesson.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, props) {
    const params = await props.params;
    return getLesson(request, params?.id);
}

export async function PATCH(request, props) {
    const params = await props.params;
    return updateLessonHandler(request, params?.id);
}

export async function DELETE(request, props) {
    const params = await props.params;
    return deleteLessonHandler(request, params?.id);
}
import { deleteStudySetHandler, updateStudySetHandler } from "@/server/modules/study-set/study-set.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, props) {
    const params = await props.params;
    return updateStudySetHandler(request, params?.id);
}

export async function DELETE(request, props) {
    const params = await props.params;
    return deleteStudySetHandler(request, params?.id);
}
import { deleteTestHandler, readTest, updateTestHandler } from "@/server/modules/test/test.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, props) {
    const params = await props.params;
    return readTest(request, params?.id);
}

export async function PATCH(request, props) {
    const params = await props.params;
    return updateTestHandler(request, params?.id);
}

export async function DELETE(request, props) {
    const params = await props.params;
    return deleteTestHandler(request, params?.id);
}
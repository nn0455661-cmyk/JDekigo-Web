import mongoose from "mongoose";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { connectMongo } from "@/server/lib/mongoose";
import MiniTestGroup from "@/server/models/miniTestGroup.model";
import Test from "@/server/models/test.model";
import { errorResponse, successResponse } from "@/server/utils/response";
import { AppError } from "@/server/utils/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, props) {
    const params = await props.params;
    try {
        await requireAdmin(request);
        if (!mongoose.Types.ObjectId.isValid(params?.id)) throw new AppError("Invalid group id", 400, "INVALID_GROUP_ID");
        const body = await request.json();
        await connectMongo();
        const group = await MiniTestGroup.findByIdAndUpdate(params.id, {
            ...(body?.title !== undefined ? { title: String(body.title).trim() } : {}),
            ...(body?.order !== undefined ? { order: Number(body.order) } : {}),
            ...(body?.status !== undefined ? { status: body.status } : {}),
        }, { new: true, runValidators: true }).lean().exec();
        if (!group) throw new AppError("Group not found", 404, "GROUP_NOT_FOUND");
        return successResponse({ item: { ...group, id: String(group._id) } });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        await requireAdmin(request);
        if (!mongoose.Types.ObjectId.isValid(params?.id)) throw new AppError("Invalid group id", 400, "INVALID_GROUP_ID");
        await connectMongo();
        const testCount = await Test.countDocuments({ miniTestGroupId: params.id });
        if (testCount > 0) throw new AppError("Delete tests in this group first", 409, "MINI_TEST_GROUP_NOT_EMPTY");
        const group = await MiniTestGroup.findByIdAndDelete(params.id).lean().exec();
        if (!group) throw new AppError("Group not found", 404, "GROUP_NOT_FOUND");
        return successResponse({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}

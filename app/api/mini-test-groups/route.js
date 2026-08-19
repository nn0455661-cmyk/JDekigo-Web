import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { connectMongo } from "@/server/lib/mongoose";
import MiniTestGroup from "@/server/models/miniTestGroup.model";
import Test from "@/server/models/test.model";
import { errorResponse, successResponse } from "@/server/utils/response";
import { AppError } from "@/server/utils/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeGroup(group, testCount = 0) {
    return {
        ...group,
        id: String(group._id),
        testCount,
        createdAt: group.createdAt?.toISOString?.() || group.createdAt,
        updatedAt: group.updatedAt?.toISOString?.() || group.updatedAt,
    };
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const level = String(searchParams.get("level") || "").trim().toUpperCase();
        const includeDrafts = searchParams.get("includeDrafts") === "true";
        const status = includeDrafts ? String(searchParams.get("status") || "").trim() : "published";
        if (!level) throw new AppError("Missing level", 400, "LEVEL_REQUIRED");

        if (includeDrafts) {
            await requireAdmin(request);
        }

        await connectMongo();
        const groups = await MiniTestGroup.find({ level, ...(status ? { status } : {}) }).sort({ order: 1, createdAt: 1 }).lean().exec();
        const testCounts = await Promise.all(groups.map((group) => Test.countDocuments({
            miniTestGroupId: group._id,
            ...(!includeDrafts ? { status: "published" } : {}),
        })));
        return successResponse({ items: groups.map((group, index) => serializeGroup(group, testCounts[index] || 0)) });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request) {
    try {
        await requireAdmin(request);
        const body = await request.json();
        const title = String(body?.title || "").trim();
        const level = String(body?.level || "").trim().toUpperCase();
        const order = Number(body?.order);
        if (!title || !level || !Number.isInteger(order) || order < 1) {
            throw new AppError("Invalid mini test group", 400, "INVALID_MINI_TEST_GROUP");
        }

        await connectMongo();
        const group = await MiniTestGroup.create({ title, level, order, status: body?.status === "published" ? "published" : "draft" });
        return successResponse({ item: serializeGroup(group.toObject()) }, 201);
    } catch (error) {
        return errorResponse(error);
    }
}

import { connectMongo } from "@/server/lib/mongoose";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import MockTestConfig from "@/server/models/mock-test-config.model";
import { errorResponse, successResponse } from "@/server/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_DISTRIBUTION = { vocabulary: 10, kanji: 8, grammar: 10, reading: 2 };

function normalizeDistribution(value = {}) {
    return Object.fromEntries(Object.keys(DEFAULT_DISTRIBUTION).map((key) => [key, Math.max(0, Number.parseInt(value[key], 10) || 0)]));
}

export async function GET(request) {
    try {
        await connectMongo();
        const level = String(new URL(request.url).searchParams.get("level") || "").toUpperCase();
        const config = level ? await MockTestConfig.findOne({ level }).lean() : null;
        return successResponse({ level, distribution: config?.distribution || DEFAULT_DISTRIBUTION, timeLimit: config?.timeLimit || 30 });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(request) {
    try {
        await requireAdmin(request);
        await connectMongo();
        const body = await request.json();
        const level = String(body.level || "").toUpperCase();
        const distribution = normalizeDistribution(body.distribution);
        const timeLimit = Math.max(1, Number.parseInt(body.timeLimit, 10) || 30);
        const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

        if (!level || total !== 30) {
            return errorResponse(new Error("Tổng số lượng phải đúng 30 câu"));
        }

        const config = await MockTestConfig.findOneAndUpdate(
            { level },
            { level, distribution, timeLimit },
            { new: true, upsert: true, runValidators: true }
        ).lean();
        return successResponse({ level, distribution: config.distribution, timeLimit: config.timeLimit });
    } catch (error) {
        return errorResponse(error);
    }
}

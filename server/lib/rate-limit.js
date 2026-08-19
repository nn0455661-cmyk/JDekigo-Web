import crypto from "crypto";
import { connectMongo } from "@/server/lib/mongoose";
import RateLimit from "@/server/models/rateLimit.model";
import { AppError } from "@/server/utils/error";

function hashKey(value) {
    return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function getClientIp(request) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const candidate = forwardedFor?.split(",")[0]?.trim()
        || request.headers.get("cf-connecting-ip")?.trim()
        || request.headers.get("x-real-ip")?.trim()
        || "unknown";

    return hashKey(candidate);
}

export async function consumeRateLimit({ key, limit, windowMs }) {
    await connectMongo();

    const now = new Date();
    const nextExpiry = new Date(now.getTime() + windowMs);
    const document = await RateLimit.findOneAndUpdate(
        { _id: hashKey(key) },
        [
            {
                $set: {
                    count: {
                        $cond: [
                            { $gt: ["$expiresAt", now] },
                            { $add: [{ $ifNull: ["$count", 0] }, 1] },
                            1,
                        ],
                    },
                    expiresAt: {
                        $cond: [
                            { $gt: ["$expiresAt", now] },
                            "$expiresAt",
                            nextExpiry,
                        ],
                    },
                },
            },
        ],
        { upsert: true, new: true, updatePipeline: true }
    ).lean().exec();

    if ((document?.count || 0) > limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((new Date(document.expiresAt).getTime() - now.getTime()) / 1000));
        throw new AppError(
            "Too many attempts. Please try again later.",
            429,
            "RATE_LIMIT_EXCEEDED",
            { retryAfterSeconds }
        );
    }

    return document;
}

export async function resetRateLimit(key) {
    await connectMongo();
    await RateLimit.deleteOne({ _id: hashKey(key) }).exec();
}

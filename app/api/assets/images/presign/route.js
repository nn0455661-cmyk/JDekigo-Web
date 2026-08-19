import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { AppError } from "@/server/utils/error";
import { errorResponse, successResponse } from "@/server/utils/response";
import { buildR2PublicUrl, getMissingR2Config, getR2Client, getR2Config } from "@/server/lib/r2";
import { buildStagedObjectKey, cleanupExpiredStagedR2Media } from "@/server/lib/r2-staged-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "video/mp4", "video/webm"]);
const EXTENSION_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
};

export async function GET(request) {
    try {
        await requireAdmin(request);
        const { searchParams } = new URL(request.url);
        const fileName = String(searchParams.get("fileName") || "image").trim();
        const contentType = String(searchParams.get("contentType") || "").trim().toLowerCase();
        const sha256 = String(searchParams.get("sha256") || "").trim().toLowerCase();
        if (!ALLOWED_TYPES.has(contentType)) {
            throw new AppError("Unsupported file type", 400, "UNSUPPORTED_FILE_TYPE");
        }

        const config = getR2Config();
        const missing = getMissingR2Config(config);
        if (missing.length) {
            throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
        }

        await cleanupExpiredStagedR2Media().catch((error) => console.error("[r2-staging] Temporary cleanup failed", error));
        const extension = EXTENSION_BY_TYPE[contentType].replace(/^\./, "");
        const key = buildStagedObjectKey("images", sha256, extension, config);
        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            ContentType: contentType,
            CacheControl: "no-store",
            Metadata: {
                "original-file-name": encodeURIComponent(fileName).slice(0, 512),
                sha256,
                temporary: "true",
            },
        });
        const uploadUrl = await getSignedUrl(getR2Client(config), command, { expiresIn: 300 });

        return successResponse({
            uploadUrl,
            method: "PUT",
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-store",
                "x-amz-meta-original-file-name": encodeURIComponent(fileName).slice(0, 512),
                "x-amz-meta-sha256": sha256,
                "x-amz-meta-temporary": "true",
            },
            url: buildR2PublicUrl(key, config),
            key,
            provider: "r2",
            temporary: true,
            expiresIn: 300,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

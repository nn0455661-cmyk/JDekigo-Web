import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { AppError } from "@/server/utils/error";
import { errorResponse, successResponse } from "@/server/utils/response";
import { buildR2PublicUrl, getMissingR2Config, getR2Client, getR2Config } from "@/server/lib/r2";
import { buildStagedObjectKey, cleanupExpiredStagedR2Media } from "@/server/lib/r2-staged-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const EXTENSION_BY_TYPE = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
};

function getMaxAudioBytes() {
    const configured = Number(process.env.R2_MAX_AUDIO_UPLOAD_BYTES || DEFAULT_MAX_AUDIO_BYTES);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_AUDIO_BYTES;
}

export async function GET(request) {
    try {
        await requireAdmin(request);
        const { searchParams } = new URL(request.url);
        const fileName = String(searchParams.get("fileName") || "audio").trim();
        const contentType = String(searchParams.get("contentType") || "").trim().toLowerCase();
        const sha256 = String(searchParams.get("sha256") || "").trim().toLowerCase();
        const size = Number(searchParams.get("size") || 0);
        const extension = EXTENSION_BY_TYPE[contentType];

        if (!extension) {
            throw new AppError("Unsupported audio type", 400, "UNSUPPORTED_AUDIO_TYPE");
        }

        if (!Number.isFinite(size) || size <= 0 || size > getMaxAudioBytes()) {
            throw new AppError("Invalid audio size", 400, "INVALID_AUDIO_SIZE");
        }

        const config = getR2Config();
        const missing = getMissingR2Config(config);
        if (missing.length) {
            throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
        }

        await cleanupExpiredStagedR2Media().catch((error) => console.error("[r2-staging] Temporary cleanup failed", error));
        const key = buildStagedObjectKey("audio", sha256, extension, config);
        const metadata = {
            "original-file-name": encodeURIComponent(fileName).slice(0, 512),
            sha256,
            temporary: "true",
        };
        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            ContentType: contentType,
            CacheControl: "no-store",
            Metadata: metadata,
        });
        const uploadUrl = await getSignedUrl(getR2Client(config), command, { expiresIn: 300 });

        return successResponse({
            uploadUrl,
            method: "PUT",
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-store",
                "x-amz-meta-original-file-name": metadata["original-file-name"],
                "x-amz-meta-sha256": sha256,
                "x-amz-meta-temporary": "true",
            },
            id: key,
            public_id: key,
            url: buildR2PublicUrl(key, config),
            key,
            provider: "r2",
            sha256,
            temporary: true,
            expiresIn: 300,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

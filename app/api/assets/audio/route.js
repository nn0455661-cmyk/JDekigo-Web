import { createHash } from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { connectMongo } from "@/server/lib/mongoose";
import AudioAsset from "@/server/models/audioAsset.model";
import { errorResponse, successResponse } from "@/server/utils/response";
import { AppError } from "@/server/utils/error";
import { buildR2PublicUrl, getMissingR2Config, getR2Client, getR2Config, getR2ObjectKey } from "@/server/lib/r2";
import { buildStagedObjectKey, cleanupExpiredStagedR2Media } from "@/server/lib/r2-staged-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const AUDIO_EXTENSION_BY_TYPE = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/x-flac": ".flac",
};

function requireR2Config() {
    const config = getR2Config();
    const missing = getMissingR2Config(config);
    if (missing.length) {
        throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
    }
    return config;
}

function getMaxAudioBytes() {
    const configured = Number(process.env.R2_MAX_AUDIO_UPLOAD_BYTES || DEFAULT_MAX_AUDIO_BYTES);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_AUDIO_BYTES;
}

function getRequestBodyValue(body, keys) {
    for (const key of keys) {
        const value = String(body?.[key] || "").trim();

        if (value) {
            return value;
        }
    }

    return "";
}

export async function POST(request) {
    try {
        await requireAdmin(request);

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new AppError("Missing file", 400, "FILE_REQUIRED");
        }

        const contentType = String(file.type || "").toLowerCase();
        if (!AUDIO_EXTENSION_BY_TYPE[contentType]) {
            throw new AppError("Unsupported file type", 400, "UNSUPPORTED_AUDIO_TYPE");
        }

        const maxAudioBytes = getMaxAudioBytes();
        if (file.size <= 0) {
            throw new AppError("Empty audio file", 400, "EMPTY_AUDIO_FILE");
        }
        if (file.size > maxAudioBytes) {
            throw new AppError(`Audio file is too large. Maximum size is ${Math.floor(maxAudioBytes / 1024 / 1024)}MB`, 413, "AUDIO_FILE_TOO_LARGE");
        }

        const config = requireR2Config();
        await cleanupExpiredStagedR2Media().catch((error) => console.error("[r2-staging] Temporary cleanup failed", error));
        const buffer = Buffer.from(await file.arrayBuffer());
        const sha256 = createHash("sha256").update(buffer).digest("hex");
        const extension = AUDIO_EXTENSION_BY_TYPE[contentType].replace(/^\./, "");
        const key = buildStagedObjectKey("audio", sha256, extension, config);
        await getR2Client(config).send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ContentLength: buffer.length,
            CacheControl: "no-store",
            Metadata: {
                "original-file-name": encodeURIComponent(String(file.name || "audio")).slice(0, 512),
                sha256,
                temporary: "true",
            },
        }));

        return successResponse(
            {
                id: key,
                public_id: key,
                url: buildR2PublicUrl(key, config),
                name: file.name,
                type: contentType,
                size: buffer.length,
                provider: "r2",
                sha256,
                temporary: true,
            },
            201
        );
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(request) {
    try {
        await requireAdmin(request);

        const body = await request.json().catch(() => ({}));
        const provider = String(body?.provider || "").trim();
        const publicId = getRequestBodyValue(body, ["public_id", "publicId", "id"]);
        const assetUrl = getRequestBodyValue(body, ["url", "audioUrl"]);

        if (provider === "mongodb" || (!provider && /^[a-f\d]{24}$/i.test(publicId))) {
            await connectMongo();
            const asset = await AudioAsset.findByIdAndDelete(publicId).lean().exec();
            return successResponse({ deleted: Boolean(asset), provider: "mongodb", id: publicId });
        }

        const r2Config = getR2Config();
        const r2ObjectKey = getR2ObjectKey(assetUrl, r2Config);
        if (provider === "r2" || r2ObjectKey) {
            const missing = getMissingR2Config(r2Config);
            if (missing.length) {
                throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
            }
            const key = r2ObjectKey || publicId;
            if (!key) {
                throw new AppError("Missing R2 audio reference", 400, "AUDIO_REFERENCE_REQUIRED");
            }
            await getR2Client(r2Config).send(new DeleteObjectCommand({ Bucket: r2Config.bucket, Key: key }));
            return successResponse({ deleted: true, provider: "r2", id: key, public_id: key, url: assetUrl });
        }

        throw new AppError("Unsupported audio reference", 400, "AUDIO_REFERENCE_UNSUPPORTED");
    } catch (error) {
        return errorResponse(error);
    }
}

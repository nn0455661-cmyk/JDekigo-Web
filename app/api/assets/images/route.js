import { NextResponse } from "next/server";
import { readdir, unlink } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { requireAdmin } from "@/server/middlewares/admin.middleware";
import { errorResponse, successResponse } from "@/server/utils/response";
import { AppError } from "@/server/utils/error";
import { buildR2PublicUrl, getMissingR2Config, getR2Client, getR2Config, getR2ObjectKey } from "@/server/lib/r2";
import { buildStagedObjectKey, cleanupExpiredStagedR2Media } from "@/server/lib/r2-staged-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".mp4", ".webm"]);
const MIME_EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
};
const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function getSafeExtension(file) {
    if (file?.type && MIME_EXTENSION_MAP[file.type]) {
        return MIME_EXTENSION_MAP[file.type];
    }

    const originalExtension = path.extname(String(file?.name || "")).toLowerCase();
    if (IMAGE_EXTENSIONS.has(originalExtension)) {
        return originalExtension;
    }

    return ".png";
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

function getLocalImagePath(assetUrl) {
    const rawValue = String(assetUrl || "").trim();

    if (!rawValue) {
        return "";
    }

    let pathname = rawValue;

    try {
        pathname = rawValue.startsWith("http://") || rawValue.startsWith("https://") ? new URL(rawValue).pathname : rawValue;
    } catch {
        pathname = rawValue;
    }

    if (!pathname.startsWith("/img/")) {
        return "";
    }

    const fileName = path.basename(pathname);

    if (!fileName || fileName.includes("..")) {
        return "";
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
        return "";
    }

    return path.join(process.cwd(), "public", "img", fileName);
}

export async function GET() {
    try {
        const publicImgDir = path.join(process.cwd(), "public", "img");
        const entries = await readdir(publicImgDir, { withFileTypes: true });

        const images = entries
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name)
            .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
            .sort((left, right) => left.localeCompare(right, "vi"))
            .map((name) => `/img/${name}`);

        return NextResponse.json({
            success: true,
            data: { images },
        });
    } catch {
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: "Không thể đọc danh sách ảnh trong public/img",
                    code: "IMAGE_DIRECTORY_READ_FAILED",
                },
            },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        await requireAdmin(request);

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            throw new AppError("Missing file", 400, "FILE_REQUIRED");
        }

        if (!MIME_EXTENSION_MAP[String(file.type || "").toLowerCase()]) {
            throw new AppError("Unsupported file type", 400, "UNSUPPORTED_FILE_TYPE");
        }

        const maxUploadBytes = getMaxUploadBytes();
        if (file.size <= 0) {
            throw new AppError("Empty file", 400, "EMPTY_FILE");
        }
        if (file.size > maxUploadBytes) {
            throw new AppError(`File is too large. Maximum size is ${Math.floor(maxUploadBytes / 1024 / 1024)}MB`, 413, "FILE_TOO_LARGE");
        }

        const config = requireR2Config();
        await cleanupExpiredStagedR2Media().catch((error) => console.error("[r2-staging] Temporary cleanup failed", error));
        const sourceBuffer = Buffer.from(await file.arrayBuffer());
        const optimized = await optimizeImageUpload(sourceBuffer, file.type);
        const sha256 = createHash("sha256").update(optimized.buffer).digest("hex");
        const key = buildStagedObjectKey("images", sha256, optimized.extension, config);
        await getR2Client(config).send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: optimized.buffer,
            ContentType: optimized.contentType,
            ContentLength: optimized.buffer.length,
            CacheControl: "no-store",
            Metadata: {
                "original-file-name": encodeURIComponent(String(file.name || "image")).slice(0, 512),
                sha256,
                temporary: "true",
            },
        }));

        return successResponse(
            {
                url: buildR2PublicUrl(key, config),
                name: file.name,
                type: optimized.contentType,
                size: optimized.buffer.length,
                originalSize: sourceBuffer.length,
                provider: "r2",
                public_id: key,
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
        const assetUrl = getRequestBodyValue(body, ["url", "image", "assetUrl"]);
        const publicId = getRequestBodyValue(body, ["public_id", "publicId"]);

        if (!assetUrl && !publicId) {
            throw new AppError("Missing image reference", 400, "IMAGE_REFERENCE_REQUIRED");
        }

        const localImagePath = getLocalImagePath(assetUrl);
        if (localImagePath) {
            try {
                await unlink(localImagePath);
            } catch (error) {
                if (error?.code !== "ENOENT") {
                    throw error;
                }
            }

            return successResponse({ deleted: true, provider: "local", url: assetUrl || `/img/${path.basename(localImagePath)}` });
        }

        const r2Config = getR2Config();
        const r2ObjectKey = getR2ObjectKey(assetUrl, r2Config);
        if (r2ObjectKey) {
            const missing = getMissingR2Config(r2Config);
            if (missing.length) {
                throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
            }
            await getR2Client(r2Config).send(new DeleteObjectCommand({ Bucket: r2Config.bucket, Key: r2ObjectKey }));
            return successResponse({ deleted: true, provider: "r2", public_id: r2ObjectKey, url: assetUrl });
        }

        throw new AppError("Unsupported image reference", 400, "IMAGE_REFERENCE_UNSUPPORTED");
    } catch (error) {
        return errorResponse(error);
    }
}

function requireR2Config() {
    const config = getR2Config();
    const missing = getMissingR2Config(config);
    if (missing.length) {
        throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
    }
    return config;
}

function getMaxUploadBytes() {
    const configured = Number(process.env.R2_MAX_UPLOAD_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
}

function getImageMaxDimension() {
    const configured = Number(process.env.R2_IMAGE_MAX_DIMENSION || 1920);
    return Number.isFinite(configured) && configured >= 320 && configured <= 8192 ? Math.floor(configured) : 1920;
}

function getImageWebpQuality() {
    const configured = Number(process.env.R2_IMAGE_WEBP_QUALITY || 82);
    return Number.isFinite(configured) && configured >= 40 && configured <= 100 ? Math.floor(configured) : 82;
}

async function optimizeImageUpload(buffer, contentType) {
    const normalizedType = String(contentType || "").toLowerCase();

    if (normalizedType === "video/mp4" || normalizedType === "video/webm") {
        return {
            buffer,
            contentType: normalizedType,
            extension: getSafeExtension({ type: normalizedType }),
        };
    }

    const optimizedBuffer = await sharp(buffer, { animated: normalizedType === "image/gif" })
        .rotate()
        .resize({
            width: getImageMaxDimension(),
            height: getImageMaxDimension(),
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: getImageWebpQuality(), alphaQuality: 90, effort: 4 })
        .toBuffer();

    return { buffer: optimizedBuffer, contentType: "image/webp", extension: "webp" };
}

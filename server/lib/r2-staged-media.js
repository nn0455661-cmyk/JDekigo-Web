import { randomUUID } from "crypto";
import {
    CopyObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { AppError } from "@/server/utils/error";
import { buildR2PublicUrl, getMissingR2Config, getR2Client, getR2Config, getR2ObjectKey } from "./r2";

const DELETE_BATCH_SIZE = 1000;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const cleanupState = globalThis.__r2StagedCleanupState || { lastRunAt: 0, promise: null };
globalThis.__r2StagedCleanupState = cleanupState;

function requireR2Config() {
    const config = getR2Config();
    const missing = getMissingR2Config(config);

    if (missing.length) {
        throw new AppError(`R2 is not configured. Missing: ${missing.join(", ")}`, 500, "R2_NOT_CONFIGURED");
    }

    return config;
}

function sanitizeExtension(extension) {
    const normalized = String(extension || "").trim().toLowerCase().replace(/^\.+/, "");
    return /^[a-z0-9]{2,5}$/.test(normalized) ? normalized : "bin";
}

export function buildStagedObjectKey(kind, sha256, extension, config = getR2Config()) {
    const normalizedKind = kind === "audio" ? "audio" : "images";
    const normalizedHash = String(sha256 || "").trim().toLowerCase();

    if (!HASH_PATTERN.test(normalizedHash)) {
        throw new AppError("Invalid SHA-256 checksum", 400, "INVALID_MEDIA_CHECKSUM");
    }

    return [
        config.tempPrefix,
        normalizedKind,
        `${randomUUID()}-${normalizedHash}.${sanitizeExtension(extension)}`,
    ].filter(Boolean).join("/");
}

function parseStagedObjectKey(key, config) {
    const normalizedKey = String(key || "").trim().replace(/^\/+/, "");
    const prefix = `${config.tempPrefix}/`;
    if (!normalizedKey.startsWith(prefix)) return null;

    const relative = normalizedKey.slice(prefix.length);
    const match = relative.match(/^(images|audio)\/[0-9a-f-]+-([a-f0-9]{64})\.([a-z0-9]{2,5})$/i);
    if (!match) return null;

    return {
        key: normalizedKey,
        kind: match[1].toLowerCase(),
        sha256: match[2].toLowerCase(),
        extension: match[3].toLowerCase(),
    };
}

function getStagedKeyFromReference(value, config) {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";

    const urlKey = getR2ObjectKey(rawValue, config);
    if (urlKey && parseStagedObjectKey(urlKey, config)) return urlKey;

    const rawKey = rawValue.replace(/^\/+/, "");
    return parseStagedObjectKey(rawKey, config) ? rawKey : "";
}

function visitStrings(value, visitor, seen = new WeakSet()) {
    if (typeof value === "string") {
        visitor(value);
        return;
    }

    if (!value || typeof value !== "object") return;
    if (value instanceof Date || Buffer.isBuffer(value) || value._bsontype || seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
        value.forEach((item) => visitStrings(item, visitor, seen));
        return;
    }

    Object.values(value).forEach((item) => visitStrings(item, visitor, seen));
}

function replaceStrings(value, replacements, seen = new WeakMap()) {
    if (typeof value === "string") return replacements.get(value) || value;
    if (!value || typeof value !== "object") return value;
    if (value instanceof Date || Buffer.isBuffer(value) || value._bsontype) return value;
    if (seen.has(value)) return seen.get(value);

    if (Array.isArray(value)) {
        const next = [];
        seen.set(value, next);
        value.forEach((item) => next.push(replaceStrings(item, replacements, seen)));
        return next;
    }

    const next = {};
    seen.set(value, next);
    Object.entries(value).forEach(([key, item]) => {
        next[key] = replaceStrings(item, replacements, seen);
    });
    return next;
}

function isNotFoundError(error) {
    return error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey";
}

async function getObjectHead(client, bucket, key) {
    try {
        return await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
    }
}

function encodeCopySource(bucket, key) {
    return `${encodeURIComponent(bucket)}/${String(key).split("/").map(encodeURIComponent).join("/")}`;
}

export async function promoteStagedR2Media(value) {
    const config = getR2Config();
    const stagedKeys = new Set();

    visitStrings(value, (candidate) => {
        const key = getStagedKeyFromReference(candidate, config);
        if (key) stagedKeys.add(key);
    });

    if (stagedKeys.size === 0) {
        return { value, stagedKeys: [], promotedKeys: [] };
    }

    requireR2Config();
    const client = getR2Client(config);
    const keyMap = new Map();

    for (const stagedKey of stagedKeys) {
        const parsed = parseStagedObjectKey(stagedKey, config);
        const finalKey = [
            config.uploadPrefix,
            parsed.kind,
            parsed.sha256.slice(0, 2),
            `${parsed.sha256}.${parsed.extension}`,
        ].filter(Boolean).join("/");

        const stagedHead = await getObjectHead(client, config.bucket, stagedKey);
        if (!stagedHead) {
            throw new AppError("Temporary media is missing or expired", 409, "STAGED_MEDIA_MISSING");
        }

        if (!await getObjectHead(client, config.bucket, finalKey)) {
            await client.send(new CopyObjectCommand({
                Bucket: config.bucket,
                Key: finalKey,
                CopySource: encodeCopySource(config.bucket, stagedKey),
                CacheControl: "public, max-age=31536000, immutable",
                ContentType: stagedHead.ContentType,
                Metadata: stagedHead.Metadata,
                MetadataDirective: "REPLACE",
            }));
        }

        keyMap.set(stagedKey, finalKey);
    }

    const replacements = new Map();
    visitStrings(value, (candidate) => {
        const stagedKey = getStagedKeyFromReference(candidate, config);
        const finalKey = keyMap.get(stagedKey);
        if (!finalKey) return;

        replacements.set(candidate, candidate === stagedKey ? finalKey : buildR2PublicUrl(finalKey, config));
    });

    return {
        value: replaceStrings(value, replacements),
        stagedKeys: [...stagedKeys],
        promotedKeys: [...new Set(keyMap.values())],
    };
}

export async function deleteStagedR2Objects(keys) {
    const config = getR2Config();
    const safeKeys = [...new Set((keys || []).map((key) => String(key || "").trim()).filter(
        (key) => Boolean(parseStagedObjectKey(key, config))
    ))];
    if (safeKeys.length === 0) return;

    requireR2Config();
    for (let index = 0; index < safeKeys.length; index += DELETE_BATCH_SIZE) {
        const batch = safeKeys.slice(index, index + DELETE_BATCH_SIZE);
        await getR2Client(config).send(new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }));
    }
}

async function runExpiredStagedCleanup(config, maxAgeHours) {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    const expiredKeys = [];
    let continuationToken;

    do {
        const page = await getR2Client(config).send(new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: `${config.tempPrefix}/`,
            ContinuationToken: continuationToken,
        }));
        (page.Contents || []).forEach((object) => {
            const lastModified = new Date(object.LastModified || 0).getTime();
            if (object.Key && parseStagedObjectKey(object.Key, config) && lastModified <= cutoff) {
                expiredKeys.push(object.Key);
            }
        });
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

    await deleteStagedR2Objects(expiredKeys);
    return expiredKeys.length;
}

export async function cleanupExpiredStagedR2Media() {
    const now = Date.now();
    if (cleanupState.promise) return cleanupState.promise;
    if (now - cleanupState.lastRunAt < CLEANUP_INTERVAL_MS) return 0;

    const config = getR2Config();
    if (getMissingR2Config(config).length) return 0;
    const configuredHours = Number(process.env.R2_TEMP_MAX_AGE_HOURS || 24);
    const maxAgeHours = Number.isFinite(configuredHours) && configuredHours >= 1 ? configuredHours : 24;

    cleanupState.promise = runExpiredStagedCleanup(config, maxAgeHours)
        .then((deletedCount) => {
            cleanupState.lastRunAt = Date.now();
            return deletedCount;
        })
        .finally(() => {
            cleanupState.promise = null;
        });

    return cleanupState.promise;
}

import mongoose from "mongoose";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getMissingR2Config, getR2Client, getR2Config, getR2ObjectKey } from "./r2";

const DELETE_BATCH_SIZE = 1000;
const NON_REFERENCE_COLLECTIONS = new Set(["audioassets", "rate_limits"]);

function visitStrings(value, visitor, seen = new WeakSet()) {
    if (typeof value === "string") {
        visitor(value);
        return;
    }

    if (!value || typeof value !== "object") return;
    if (value instanceof Date || Buffer.isBuffer(value) || value._bsontype) return;
    if (seen.has(value)) return;

    seen.add(value);

    if (Array.isArray(value)) {
        value.forEach((item) => visitStrings(item, visitor, seen));
        return;
    }

    Object.values(value).forEach((item) => visitStrings(item, visitor, seen));
}

function getRecognizedPrefixes(config) {
    return [...new Set([
        config.uploadPrefix,
        config.tempPrefix,
    ].filter(Boolean))];
}

function normalizeRawObjectKey(value, prefixes) {
    const rawValue = String(value || "").trim().replace(/^\/+/, "");
    if (!rawValue.includes("/")) return "";

    const candidates = [rawValue];

    try {
        const decoded = decodeURIComponent(rawValue);
        if (decoded !== rawValue) candidates.push(decoded);
    } catch {
        // Keep the original value when it is not URI encoded.
    }

    return candidates.find((candidate) => prefixes.some(
        (prefix) => candidate === prefix || candidate.startsWith(`${prefix}/`)
    )) || "";
}

export function getR2ObjectKeyFromReference(value, config = getR2Config(), prefixes = getRecognizedPrefixes(config)) {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";

    if (config.publicBaseUrl && rawValue.startsWith(config.publicBaseUrl)) {
        const urlKey = getR2ObjectKey(rawValue, config);
        if (urlKey) return urlKey;
    }

    return normalizeRawObjectKey(rawValue, prefixes);
}

export function collectR2ObjectKeys(values, config = getR2Config()) {
    const keys = new Set();
    const prefixes = getRecognizedPrefixes(config);

    visitStrings(values, (value) => {
        const key = getR2ObjectKeyFromReference(value, config, prefixes);
        if (key) keys.add(key);
    });

    return keys;
}

async function findReferencedKeys(candidateKeys, config) {
    const remaining = new Set(candidateKeys);
    const referenced = new Set();
    const database = mongoose.connection.db;
    const prefixes = getRecognizedPrefixes(config);

    if (!database || remaining.size === 0) return referenced;

    const collections = await database.listCollections({}, { nameOnly: true }).toArray();

    collectionLoop:
    for (const { name } of collections) {
        if (!name || name.startsWith("system.") || NON_REFERENCE_COLLECTIONS.has(name)) continue;

        const cursor = database.collection(name).find({}, { batchSize: 100 });

        try {
            for await (const document of cursor) {
                visitStrings(document, (value) => {
                    const key = getR2ObjectKeyFromReference(value, config, prefixes);
                    if (!key || !remaining.has(key)) return;

                    remaining.delete(key);
                    referenced.add(key);
                });

                if (remaining.size === 0) break collectionLoop;
            }
        } finally {
            await cursor.close();
        }
    }

    return referenced;
}

async function deleteObjectKeys(keys, config) {
    const keyList = [...keys];
    const failedKeys = new Set();
    let deletedCount = 0;

    for (let index = 0; index < keyList.length; index += DELETE_BATCH_SIZE) {
        const batch = keyList.slice(index, index + DELETE_BATCH_SIZE);
        const result = await getR2Client(config).send(new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: {
                Objects: batch.map((Key) => ({ Key })),
                Quiet: false,
            },
        }));

        const batchFailures = new Set((result.Errors || []).map((item) => item.Key).filter(Boolean));
        batchFailures.forEach((key) => failedKeys.add(key));
        deletedCount += batch.length - batchFailures.size;
    }

    return { deletedCount, failedKeys };
}

export async function cleanupUnreferencedR2Media(deletedDocuments) {
    const config = getR2Config();
    const missingConfig = getMissingR2Config(config);

    if (missingConfig.length) {
        return {
            candidateCount: 0,
            deletedCount: 0,
            retainedCount: 0,
            failedCount: 0,
            skipped: true,
            reason: "R2_NOT_CONFIGURED",
        };
    }

    const candidateKeys = collectR2ObjectKeys(deletedDocuments, config);

    if (candidateKeys.size === 0) {
        return {
            candidateCount: 0,
            deletedCount: 0,
            retainedCount: 0,
            failedCount: 0,
            skipped: false,
        };
    }

    try {
        const referencedKeys = await findReferencedKeys(candidateKeys, config);
        const unreferencedKeys = new Set([...candidateKeys].filter((key) => !referencedKeys.has(key)));
        const { deletedCount, failedKeys } = await deleteObjectKeys(unreferencedKeys, config);

        if (failedKeys.size) {
            console.error(`[r2-cleanup] Failed to delete ${failedKeys.size} object(s)`);
        }

        return {
            candidateCount: candidateKeys.size,
            deletedCount,
            retainedCount: referencedKeys.size,
            failedCount: failedKeys.size,
            skipped: false,
        };
    } catch (error) {
        console.error("[r2-cleanup] Unable to verify or delete unreferenced media", error);
        return {
            candidateCount: candidateKeys.size,
            deletedCount: 0,
            retainedCount: 0,
            failedCount: candidateKeys.size,
            skipped: false,
        };
    }
}

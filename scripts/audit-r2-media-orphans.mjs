import { mkdir, writeFile } from "fs/promises";
import path from "path";
import process from "process";
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const APPLY = process.argv.includes("--apply");
const GRACE_HOURS = Math.max(1, Number(process.env.R2_ORPHAN_GRACE_HOURS || 168));
const DELETE_BATCH_SIZE = 1000;
const IGNORED_COLLECTIONS = new Set(["audioassets", "rate_limits"]);

function required(name, fallback = "") {
    const value = String(process.env[name] || fallback).trim();
    if (!value) throw new Error(`Missing ${name}`);
    return value;
}

const accountId = required("R2_ACCOUNT_ID");
const accessKeyId = required("R2_ACCESS_KEY_ID");
const secretAccessKey = required("R2_SECRET_ACCESS_KEY");
const bucket = required("R2_BUCKET_NAME");
const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || "").trim().replace(/\/$/, "");
const managedPrefixes = [...new Set([
    String(process.env.R2_UPLOAD_PREFIX || "web-learn-japan/uploads").trim().replace(/^\/+|\/+$/g, ""),
    String(process.env.R2_TEMP_PREFIX || "web-learn-japan/temp").trim().replace(/^\/+|\/+$/g, ""),
].filter(Boolean))];
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
});

function visitStrings(value, visitor) {
    if (typeof value === "string") {
        visitor(value);
        return;
    }
    if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || value._bsontype) return;
    if (Array.isArray(value)) {
        value.forEach((item) => visitStrings(item, visitor));
        return;
    }
    Object.values(value).forEach((item) => visitStrings(item, visitor));
}

function keyFromReference(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (publicBaseUrl && raw.startsWith(publicBaseUrl)) {
        try {
            const base = new URL(publicBaseUrl);
            const candidate = new URL(raw);
            const basePath = base.pathname.replace(/\/$/, "");
            if (candidate.origin === base.origin && candidate.pathname.startsWith(basePath ? `${basePath}/` : "/")) {
                return decodeURIComponent(candidate.pathname.slice((basePath ? `${basePath}/` : "/").length));
            }
        } catch {
            return "";
        }
    }

    const rawKey = raw.replace(/^\/+/, "");
    return managedPrefixes.some((prefix) => rawKey.startsWith(`${prefix}/`)) ? rawKey : "";
}

async function collectDatabaseReferences() {
    await mongoose.connect(required("MONGODB_URI"), { maxPoolSize: 3, serverSelectionTimeoutMS: 10000 });
    const references = new Set();
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    for (const { name } of collections) {
        if (!name || name.startsWith("system.") || IGNORED_COLLECTIONS.has(name)) continue;
        const cursor = mongoose.connection.db.collection(name).find({}, { batchSize: 100 });
        try {
            for await (const document of cursor) {
                visitStrings(document, (value) => {
                    const key = keyFromReference(value);
                    if (key) references.add(key);
                });
            }
        } finally {
            await cursor.close();
        }
    }

    return references;
}

async function listManagedObjects() {
    const objects = [];
    for (const prefix of managedPrefixes) {
        let continuationToken;
        do {
            const page = await r2.send(new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: `${prefix}/`,
                ContinuationToken: continuationToken,
            }));
            objects.push(...(page.Contents || []).filter((item) => item.Key));
            continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (continuationToken);
    }
    return objects;
}

async function deleteObjects(keys) {
    for (let index = 0; index < keys.length; index += DELETE_BATCH_SIZE) {
        const batch = keys.slice(index, index + DELETE_BATCH_SIZE);
        const result = await r2.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }));
        if (result.Errors?.length) {
            throw new Error(`R2 failed to delete ${result.Errors.length} object(s)`);
        }
    }
}

const startedAt = new Date();
try {
    const [references, objects] = await Promise.all([collectDatabaseReferences(), listManagedObjects()]);
    const cutoff = Date.now() - GRACE_HOURS * 60 * 60 * 1000;
    const orphanObjects = objects.filter((object) => (
        !references.has(object.Key) && new Date(object.LastModified || 0).getTime() <= cutoff
    ));
    const orphanKeys = orphanObjects.map((object) => object.Key);

    if (APPLY && orphanKeys.length) await deleteObjects(orphanKeys);

    const report = {
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        mode: APPLY ? "apply" : "dry-run",
        bucket,
        managedPrefixes,
        graceHours: GRACE_HOURS,
        databaseReferenceCount: references.size,
        objectCount: objects.length,
        orphanCount: orphanKeys.length,
        deletedCount: APPLY ? orphanKeys.length : 0,
        orphans: orphanObjects.map((object) => ({
            key: object.Key,
            size: object.Size || 0,
            lastModified: object.LastModified?.toISOString?.() || null,
        })),
    };
    const runDirectory = path.join(process.cwd(), "r2-audit-runs", startedAt.toISOString().replace(/[:.]/g, "-"));
    await mkdir(runDirectory, { recursive: true });
    await writeFile(path.join(runDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ...report, orphans: undefined }, null, 2));
} finally {
    await mongoose.disconnect().catch(() => {});
}

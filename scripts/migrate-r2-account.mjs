import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import mongoose from "mongoose";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env"), quiet: true });
dotenv.config({ path: path.join(root, ".env.local"), override: true, quiet: true });

const apply = process.argv.includes("--apply");
const concurrency = Math.max(1, Number(process.env.R2_TRANSFER_CONCURRENCY || 3));
const maxObjectBytes = Math.max(
    1,
    Number(process.env.R2_TRANSFER_MAX_OBJECT_BYTES || 200 * 1024 * 1024),
);
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const reportDirectory = path.join(root, "r2-transfer-runs", runId);

function required(name) {
    const value = String(process.env[name] || "").trim();
    if (!value) throw new Error(`Missing ${name}`);
    return value;
}

function normalizedBaseUrl(name) {
    return required(name).replace(/\/+$/, "");
}

function makeClient(prefix) {
    const accountId = required(`${prefix}_ACCOUNT_ID`);
    return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: required(`${prefix}_ACCESS_KEY_ID`),
            secretAccessKey: required(`${prefix}_SECRET_ACCESS_KEY`),
        },
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });
}

async function listObjects(client, bucket) {
    const objects = [];
    let continuationToken;

    do {
        const page = await client.send(new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
        }));
        objects.push(...(page.Contents || []).filter((object) => object.Key));
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

    return objects;
}

async function runPool(items, worker, limit) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runner() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            try {
                results[index] = { ok: true, value: await worker(items[index], index) };
            } catch (error) {
                results[index] = {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
    return results;
}

function keyFromSourceUrl(value, sourceBaseUrl) {
    if (typeof value !== "string" || !value.startsWith(`${sourceBaseUrl}/`)) return "";

    try {
        const source = new URL(sourceBaseUrl);
        const candidate = new URL(value);
        if (candidate.origin !== source.origin) return "";

        const basePath = source.pathname.replace(/\/$/, "");
        const prefix = basePath ? `${basePath}/` : "/";
        if (!candidate.pathname.startsWith(prefix)) return "";
        return decodeURIComponent(candidate.pathname.slice(prefix.length));
    } catch {
        return "";
    }
}

function visitAndRewrite(value, context) {
    if (typeof value === "string") {
        const key = keyFromSourceUrl(value, context.sourceBaseUrl);
        if (!key) return { value, changed: false };

        context.referenceCount += 1;
        if (!context.sourceKeys.has(key)) {
            context.missingKeys.add(key);
            return { value, changed: false };
        }

        const suffix = value.slice(context.sourceBaseUrl.length);
        return { value: `${context.targetBaseUrl}${suffix}`, changed: true };
    }

    if (!value || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value) || value._bsontype) {
        return { value, changed: false };
    }

    let changed = false;

    if (Array.isArray(value)) {
        const next = value.map((item) => {
            const result = visitAndRewrite(item, context);
            changed ||= result.changed;
            return result.value;
        });
        return { value: changed ? next : value, changed };
    }

    const next = {};
    for (const [key, item] of Object.entries(value)) {
        const result = visitAndRewrite(item, context);
        changed ||= result.changed;
        next[key] = result.value;
    }
    return { value: changed ? next : value, changed };
}

async function inspectAndMaybeRewriteDatabase(sourceKeys, sourceBaseUrl, targetBaseUrl) {
    if (sourceBaseUrl === targetBaseUrl) {
        return { referenceCount: 0, changedDocumentCount: 0, missingKeys: [] };
    }

    const mongoUri = required("MONGODB_URI");
    const connection = await mongoose.createConnection(mongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
    }).asPromise();
    const context = {
        sourceBaseUrl,
        targetBaseUrl,
        sourceKeys,
        referenceCount: 0,
        missingKeys: new Set(),
    };
    let changedDocumentCount = 0;

    try {
        const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();

        for (const { name } of collections) {
            if (!name || name.startsWith("system.")) continue;

            const collection = connection.db.collection(name);
            const operations = [];
            const cursor = collection.find({}, { batchSize: 100 });

            try {
                for await (const document of cursor) {
                    const result = visitAndRewrite(document, context);
                    if (!result.changed) continue;

                    changedDocumentCount += 1;
                    if (apply) {
                        operations.push({
                            replaceOne: {
                                filter: { _id: document._id },
                                replacement: result.value,
                            },
                        });
                    }

                    if (operations.length >= 100) {
                        await collection.bulkWrite(operations, { ordered: true });
                        operations.length = 0;
                    }
                }
            } finally {
                await cursor.close();
            }

            if (operations.length) {
                await collection.bulkWrite(operations, { ordered: true });
            }
        }
    } finally {
        await connection.close();
    }

    return {
        referenceCount: context.referenceCount,
        changedDocumentCount,
        missingKeys: [...context.missingKeys],
    };
}

async function copyObject(sourceClient, targetClient, sourceBucket, targetBucket, object, index, total) {
    const size = Number(object.Size || 0);
    if (size > maxObjectBytes) {
        throw new Error(`${object.Key} is ${size} bytes; increase R2_TRANSFER_MAX_OBJECT_BYTES to copy it.`);
    }

    const source = await sourceClient.send(new GetObjectCommand({
        Bucket: sourceBucket,
        Key: object.Key,
    }));
    const body = await source.Body.transformToByteArray();

    await targetClient.send(new PutObjectCommand({
        Bucket: targetBucket,
        Key: object.Key,
        Body: body,
        ContentLength: body.byteLength,
        CacheControl: source.CacheControl,
        ContentDisposition: source.ContentDisposition,
        ContentEncoding: source.ContentEncoding,
        ContentLanguage: source.ContentLanguage,
        ContentType: source.ContentType,
        Metadata: source.Metadata,
    }));

    const target = await targetClient.send(new HeadObjectCommand({
        Bucket: targetBucket,
        Key: object.Key,
    }));
    if (Number(target.ContentLength) !== body.byteLength) {
        throw new Error(`Size verification failed for ${object.Key}.`);
    }

    console.log(`[copy] ${index + 1}/${total} ${object.Key}`);
    return { key: object.Key, bytes: body.byteLength };
}

async function writeReport(report) {
    await mkdir(reportDirectory, { recursive: true });
    const reportPath = path.join(reportDirectory, "report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return reportPath;
}

async function main() {
    const sourceClient = makeClient("R2_SOURCE");
    const targetClient = makeClient("R2_TARGET");
    const sourceBucket = required("R2_SOURCE_BUCKET_NAME");
    const targetBucket = required("R2_TARGET_BUCKET_NAME");
    const sourceBaseUrl = normalizedBaseUrl("R2_SOURCE_PUBLIC_BASE_URL");
    const targetBaseUrl = normalizedBaseUrl("R2_TARGET_PUBLIC_BASE_URL");
    const objects = await listObjects(sourceClient, sourceBucket);
    const sourceKeys = new Set(objects.map((object) => object.Key));
    const totalBytes = objects.reduce((sum, object) => sum + Number(object.Size || 0), 0);

    console.log(`Source objects: ${objects.length}`);
    console.log(`Source bytes: ${totalBytes}`);

    let copyResults = [];
    if (apply) {
        copyResults = await runPool(
            objects,
            (object, index) => copyObject(
                sourceClient,
                targetClient,
                sourceBucket,
                targetBucket,
                object,
                index,
                objects.length,
            ),
            concurrency,
        );

        const failures = copyResults.filter((result) => !result.ok);
        if (failures.length) {
            const reportPath = await writeReport({
                runId,
                mode: "apply",
                sourceBucket,
                targetBucket,
                objectCount: objects.length,
                totalBytes,
                copiedCount: copyResults.length - failures.length,
                failures,
                databaseUpdated: false,
            });
            throw new Error(`${failures.length} object(s) failed. Database was not updated. See ${reportPath}`);
        }
    }

    const database = await inspectAndMaybeRewriteDatabase(
        sourceKeys,
        sourceBaseUrl,
        targetBaseUrl,
    );
    const report = {
        runId,
        mode: apply ? "apply" : "dry-run",
        sourceBucket,
        targetBucket,
        sourceBaseUrl,
        targetBaseUrl,
        objectCount: objects.length,
        totalBytes,
        copiedCount: apply ? copyResults.length : 0,
        ...database,
        databaseUpdated: apply && sourceBaseUrl !== targetBaseUrl,
    };
    const reportPath = await writeReport(report);

    console.log(JSON.stringify(report, null, 2));
    console.log(`Report: ${reportPath}`);
    if (!apply) console.log("Dry run only. Run again with --apply after checking this report.");
}

main().catch((error) => {
    console.error(`R2 transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
});

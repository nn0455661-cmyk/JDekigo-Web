import process from "process";
import {
    GetBucketLifecycleConfigurationCommand,
    PutBucketLifecycleConfigurationCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const RULE_ID = "jdeki-go-temp-media-expiration";

function required(name) {
    const value = String(process.env[name] || "").trim();
    if (!value) throw new Error(`Missing ${name}`);
    return value;
}

const accountId = required("R2_ACCOUNT_ID");
const bucket = required("R2_BUCKET_NAME");
const tempPrefix = `${String(process.env.R2_TEMP_PREFIX || "web-learn-japan/temp").trim().replace(/^\/+|\/+$/g, "")}/`;
const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
});

async function configureLifecycle() {
    let currentRules = [];
    try {
        const current = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
        currentRules = current.Rules || [];
    } catch (error) {
        const status = error?.$metadata?.httpStatusCode;
        if (status !== 404 && error?.name !== "NoSuchLifecycleConfiguration") throw error;
    }

    const nextRule = {
        ID: RULE_ID,
        Status: "Enabled",
        Filter: { Prefix: tempPrefix },
        Expiration: { Days: 1 },
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
    };
    const nextRules = [...currentRules.filter((rule) => rule.ID !== RULE_ID), nextRule];

    await client.send(new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: { Rules: nextRules },
    }));

    console.log(JSON.stringify({
        bucket,
        ruleId: RULE_ID,
        prefix: tempPrefix,
        expiresAfterDays: 1,
        preservedRuleCount: nextRules.length - 1,
    }, null, 2));
}

try {
    await configureLifecycle();
} catch (error) {
    if (error?.$metadata?.httpStatusCode === 403 || error?.name === "AccessDenied") {
        console.error("R2 credential không có quyền quản lý lifecycle. Hãy bật rule trong Dashboard hoặc dùng token R2 Admin Read & Write; cleanup 24 giờ trong ứng dụng vẫn hoạt động.");
        process.exitCode = 1;
    } else {
        throw error;
    }
}

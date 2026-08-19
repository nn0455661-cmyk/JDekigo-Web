import { S3Client } from "@aws-sdk/client-s3";

let cachedClient = null;
let cachedFingerprint = "";

export function getR2Config() {
    const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
    const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
    const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
    const bucket = String(process.env.R2_BUCKET_NAME || "").trim();
    const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_URL || "").trim().replace(/\/$/, "");
    const uploadPrefix = String(process.env.R2_UPLOAD_PREFIX || "web-learn-japan/uploads").trim().replace(/^\/+|\/+$/g, "");
    const tempPrefix = String(process.env.R2_TEMP_PREFIX || "web-learn-japan/temp").trim().replace(/^\/+|\/+$/g, "");
    return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl, uploadPrefix, tempPrefix };
}

export function getMissingR2Config(config = getR2Config()) {
    return [
        ["R2_ACCOUNT_ID", config.accountId],
        ["R2_ACCESS_KEY_ID", config.accessKeyId],
        ["R2_SECRET_ACCESS_KEY", config.secretAccessKey],
        ["R2_BUCKET_NAME", config.bucket],
        ["R2_PUBLIC_BASE_URL/R2_PUBLIC_URL", config.publicBaseUrl],
    ].filter(([, value]) => !value).map(([name]) => name);
}

export function getR2Client(config = getR2Config()) {
    const fingerprint = [config.accountId, config.accessKeyId, config.secretAccessKey].join(":");
    if (!cachedClient || fingerprint !== cachedFingerprint) {
        cachedClient = new S3Client({
            region: "auto",
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        });
        cachedFingerprint = fingerprint;
    }
    return cachedClient;
}

function encodeObjectKey(key) {
    return String(key || "").split("/").filter(Boolean).map((segment) => encodeURIComponent(segment)).join("/");
}

export function buildR2PublicUrl(key, config = getR2Config()) {
    return `${config.publicBaseUrl}/${encodeObjectKey(key)}`;
}

export function getR2ObjectKey(assetUrl, config = getR2Config()) {
    const rawValue = String(assetUrl || "").trim();
    if (!rawValue || !config.publicBaseUrl) return "";

    try {
        const baseUrl = new URL(config.publicBaseUrl);
        const candidateUrl = new URL(rawValue);
        if (candidateUrl.origin !== baseUrl.origin) return "";

        const basePath = baseUrl.pathname.replace(/\/$/, "");
        const expectedPrefix = basePath ? `${basePath}/` : "/";
        if (!candidateUrl.pathname.startsWith(expectedPrefix)) return "";

        const key = decodeURIComponent(candidateUrl.pathname.slice(expectedPrefix.length));
        if (!key || key.split("/").some((segment) => !segment || segment === "." || segment === "..")) return "";
        return key;
    } catch {
        return "";
    }
}

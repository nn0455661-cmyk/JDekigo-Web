import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "@/server/utils/error";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

function getJwtSecret(name) {
    const value = process.env[name];

    if (!value) {
        throw new AppError(`Missing environment variable: ${name}`, 500, "JWT_SECRET_MISSING");
    }

    if (process.env.NODE_ENV === "production") {
        if (value.length < 32) {
            throw new AppError(`${name} must contain at least 32 characters`, 500, "JWT_SECRET_TOO_SHORT");
        }

        const otherName = name === "JWT_ACCESS_SECRET" ? "JWT_REFRESH_SECRET" : "JWT_ACCESS_SECRET";
        if (process.env[otherName] && process.env[otherName] === value) {
            throw new AppError("JWT access and refresh secrets must be different", 500, "JWT_SECRETS_MUST_DIFFER");
        }
    }

    return value;
}

function buildPayload(payload, tokenType) {
    return {
        sub: String(payload.sub),
        email: String(payload.email),
        role: String(payload.role || "user").trim().toLowerCase(),
        tokenType,
    };
}

export function signAccessToken(payload) {
    return jwt.sign(buildPayload(payload, "access"), getJwtSecret("JWT_ACCESS_SECRET"), {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
}

export function signRefreshToken(payload) {
    return jwt.sign(buildPayload(payload, "refresh"), getJwtSecret("JWT_REFRESH_SECRET"), {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
}

export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, getJwtSecret("JWT_ACCESS_SECRET"));

    if (!decoded || decoded.tokenType !== "access") {
        throw new Error("Invalid access token");
    }

    return decoded;
}

export function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, getJwtSecret("JWT_REFRESH_SECRET"));

    if (!decoded || decoded.tokenType !== "refresh") {
        throw new Error("Invalid refresh token");
    }

    return decoded;
}

export function hashToken(token) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
}

import { AppError } from "@/server/utils/error";
import { errorResponse, successResponse } from "@/server/utils/response";
import { loginSchema, registerSchema } from "./auth.validation";
import { loginUser, logoutUser, refreshSession, registerUser } from "./auth.service";
import { consumeRateLimit, getClientIp, resetRateLimit } from "@/server/lib/rate-limit";

const REFRESH_COOKIE_NAME = "refresh_token";
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function loginIdentityKey(email) {
    return `auth:login:identity:${normalizeEmail(email)}`;
}

function applyRefreshCookie(response, refreshToken) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return response;
}

export async function register(request) {
    try {
        const body = registerSchema.parse(await request.json());
        await consumeRateLimit({
            key: `auth:register:ip:${getClientIp(request)}`,
            limit: 5,
            windowMs: REGISTER_WINDOW_MS,
        });
        const result = await registerUser(body);

        const response = successResponse(
            {
                user: result.user,
                accessToken: result.tokens.accessToken,
                expiresIn: ACCESS_TOKEN_MAX_AGE,
            },
            201
        );

        return applyRefreshCookie(response, result.tokens.refreshToken);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function login(request) {
    try {
        const body = loginSchema.parse(await request.json());
        const identityKey = loginIdentityKey(body.email);

        await Promise.all([
            consumeRateLimit({
                key: `auth:login:ip:${getClientIp(request)}`,
                limit: 20,
                windowMs: LOGIN_WINDOW_MS,
            }),
            consumeRateLimit({
                key: identityKey,
                limit: 5,
                windowMs: LOGIN_WINDOW_MS,
            }),
        ]);

        const result = await loginUser(body);
        await resetRateLimit(identityKey);

        const response = successResponse({
            user: result.user,
            accessToken: result.tokens.accessToken,
            expiresIn: ACCESS_TOKEN_MAX_AGE,
        });

        return applyRefreshCookie(response, result.tokens.refreshToken);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function refresh(request) {
    try {
        await consumeRateLimit({
            key: `auth:refresh:ip:${getClientIp(request)}`,
            limit: 60,
            windowMs: LOGIN_WINDOW_MS,
        });
        const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

        if (!refreshToken) {
            throw new AppError("Refresh token is missing", 401, "REFRESH_TOKEN_MISSING");
        }

        const result = await refreshSession(refreshToken);
        const response = successResponse({
            user: result.user,
            accessToken: result.tokens.accessToken,
            expiresIn: ACCESS_TOKEN_MAX_AGE,
        });

        return applyRefreshCookie(response, result.tokens.refreshToken);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function logout(request) {
    try {
        const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
        await logoutUser(refreshToken);

        const response = successResponse({ success: true });
        response.cookies.set(REFRESH_COOKIE_NAME, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return response;
    } catch (error) {
        return errorResponse(error);
    }
}

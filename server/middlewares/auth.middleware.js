import { AppError } from "@/server/utils/error";
import { verifyAccessToken } from "@/server/lib/jwt";

function extractAccessToken(request) {
    const authorization = request.headers.get("authorization");

    if (authorization && authorization.startsWith("Bearer ")) {
        return authorization.slice(7).trim();
    }

    return request.cookies.get("access_token")?.value || "";
}

export async function requireAuth(request) {
    const token = extractAccessToken(request);

    if (!token) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    let payload;

    try {
        payload = verifyAccessToken(token);
    } catch {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
    };
}

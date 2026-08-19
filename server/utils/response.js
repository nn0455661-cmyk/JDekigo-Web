import { NextResponse } from "next/server";
import { resolveError } from "./error";

export function successResponse(data, status = 200) {
    return NextResponse.json(
        {
            success: true,
            data,
        },
        { status }
    );
}

export function errorResponse(error) {
    const resolved = resolveError(error);

    if (resolved.statusCode >= 500) {
        console.error("[api] Unhandled error", error);
    }

    return NextResponse.json(
        {
            success: false,
            error: {
                message: resolved.message,
                code: resolved.code,
                details: resolved.details,
            },
        },
        { status: resolved.statusCode }
    );
}

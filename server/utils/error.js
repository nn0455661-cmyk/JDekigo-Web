import { ZodError } from "zod";

export class AppError extends Error {
    constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = undefined) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function resolveError(error) {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof ZodError) {
        return new AppError("Validation failed", 400, "VALIDATION_ERROR", error.flatten());
    }

    if (error?.name === "CastError") {
        return new AppError("Invalid id format", 400, "INVALID_ID_FORMAT");
    }

    if (error?.name === "ValidationError") {
        return new AppError(error.message || "Validation failed", 400, "VALIDATION_ERROR");
    }

    if (error instanceof Error) {
        return new AppError("Internal server error");
    }

    return new AppError("Internal server error");
}

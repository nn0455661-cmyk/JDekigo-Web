import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().trim().min(1).max(80).optional().default(""),
    email: z.string().trim().email(),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long"),
});

export const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1, "Password is required"),
});

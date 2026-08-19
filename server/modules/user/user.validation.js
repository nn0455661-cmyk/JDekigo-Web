import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).optional(),
    gender: z.string().trim().max(30).optional(),
    avatar: z.string().trim().max(500).optional(),
    location: z.string().trim().max(120).optional(),
    goal: z.string().trim().max(200).optional(),
    preferredStudyTime: z.string().trim().max(80).optional(),
    level: z.string().trim().max(30).optional(),
    birthday: z.string().trim().max(30).optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    nextPassword: z.string().min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters long"),
});

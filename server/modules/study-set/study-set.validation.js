import { z } from "zod";

export const studySetCardSchema = z.object({
    id: z.string().trim().min(1).optional(),
}).passthrough();

export const createStudySetSchema = z.object({
    name: z.string().trim().min(1),
    cards: z.array(studySetCardSchema).default([]),
}).passthrough();

export const updateStudySetSchema = z.object({
    name: z.string().trim().min(1).optional(),
    cards: z.array(studySetCardSchema).optional(),
}).passthrough();
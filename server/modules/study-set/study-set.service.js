import { connectMongo } from "@/server/lib/mongoose";
import { AppError } from "@/server/utils/error";
import {
    createStudySet,
    deleteStudySetById,
    findStudySetById,
    findStudySetsByUserId,
    updateStudySetById,
} from "./study-set.repository";

function normalizeCard(card, index) {
    const source = card && typeof card === "object" ? card : {};
    const term = String(source.term || source.word || "").trim();
    const note = String(source.note || source.example || "").trim();
    const noteMeaning = String(source.noteMeaning || "").trim();
    const id = String(source.id || source._id || `${term || "card"}-${index}`).trim();

    return {
        ...source,
        id,
        term,
        word: String(source.word || term).trim(),
        meaning: String(source.meaning || "").trim(),
        note,
        noteMeaning: noteMeaning,
    };
}

function normalizeStudySet(set, index) {
    const source = set && typeof set === "object" ? set : {};

    return {
        name: String(source.name || "Untitled").trim(),
        cards: Array.isArray(source.cards)
            ? source.cards.map((card, cardIndex) =>
                normalizeCard(card, cardIndex)
            )
            : [],
    };
}

function serializeStudySet(doc) {
    return {
        _id: String(doc._id),
        name: doc.name,
        cards: Array.isArray(doc.cards) ? doc.cards.map((card, index) => normalizeCard(card, index)) : [],
        createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
        updatedAtISO: doc.updatedAt?.toISOString?.().slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
}

export async function fetchUserStudySets(userId) {
    await connectMongo();
    const items = await findStudySetsByUserId(userId);
    return { items: items.map(serializeStudySet) };
}

export async function createUserStudySet(userId, input) {
    await connectMongo();
    const normalized = normalizeStudySet(input, 0);
    const saved = await createStudySet(userId, normalized);

    return { item: serializeStudySet(saved) };
}

export async function updateUserStudySet(userId, studySetId, input) {
    await connectMongo();

    const existing = await findStudySetById(userId, studySetId);

    if (!existing) {
        throw new AppError("Study set not found", 404, "STUDY_SET_NOT_FOUND");
    }

    const normalized = normalizeStudySet({ ...existing, ...input, _id: existing._id }, 0);
    const saved = await updateStudySetById(userId, studySetId, normalized);

    if (!saved) {
        throw new AppError("Study set not found", 404, "STUDY_SET_NOT_FOUND");
    }

    return { item: serializeStudySet(saved) };
}

export async function deleteUserStudySet(userId, studySetId) {
    await connectMongo();

    const deleted = await deleteStudySetById(userId, studySetId);

    if (!deleted) {
        throw new AppError("Study set not found", 404, "STUDY_SET_NOT_FOUND");
    }

    return { success: true };
}

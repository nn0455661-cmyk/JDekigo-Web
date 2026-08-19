import { AppError } from "@/server/utils/error";
import Grammar from "@/server/models/grammar.model";
import Kanji from "@/server/models/kanji.model";
import Reading from "@/server/models/reading.model";
import Shadowing from "@/server/models/shadowing.model";
import Speaking from "@/server/models/speaking.model";
import Vocabulary from "@/server/models/vocabulary.model";

const MODEL_MAP = {
    grammar: Grammar,
    vocabulary: Vocabulary,
    kanji: Kanji,
    reading: Reading,
    shadowing: Shadowing,
    video: Shadowing,
    speaking: Speaking,
};

function getModel(moduleKey) {
    const model = MODEL_MAP[moduleKey];

    if (!model) {
        throw new AppError("Invalid content module", 400, "INVALID_CONTENT_MODULE");
    }

    return model;
}

function serializeDocument(document) {
    if (!document) {
        return null;
    }

    const plain = typeof document.toObject === "function" ? document.toObject() : document;
    return {
        ...plain,
        id: String(plain._id),
        audioAssetId: plain.audioAssetId ? String(plain.audioAssetId) : plain.audioAssetId,
        createdAt: plain.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: plain.updatedAt?.toISOString?.() || new Date().toISOString(),
        updatedAtISO: plain.updatedAt?.toISOString?.().slice(0, 10) || new Date().toISOString().slice(0, 10),
    };
}

export async function findContentItems(moduleKey, lessonId) {
    const model = getModel(moduleKey);
    const query = lessonId ? { lessonId } : {};

    return model.find(query).sort({ createdAt: 1 }).lean().exec();
}

export async function findContentItemById(moduleKey, id) {
    const model = getModel(moduleKey);
    return model.findById(id).lean().exec();
}

export async function createContentItem(moduleKey, input) {
    const model = getModel(moduleKey);
    return model.create(input);
}

export async function updateContentItem(moduleKey, id, input) {
    const model = getModel(moduleKey);
    return model.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean().exec();
}

export async function deleteContentItem(moduleKey, id) {
    const model = getModel(moduleKey);
    return model.findByIdAndDelete(id).lean().exec();
}

export function normalizeContentItem(document) {
    return serializeDocument(document);
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function suggestDictionaryEntry(term) {
    const normalizedTerm = String(term || "").trim();

    if (!normalizedTerm) {
        return null;
    }

    const exactMatcher = new RegExp(`^${escapeRegExp(normalizedTerm)}$`, "i");
    const partialMatcher = new RegExp(escapeRegExp(normalizedTerm), "i");

    const query = {
        status: "published",
        $or: [
            { word: exactMatcher },
            { reading: exactMatcher },
            { meaning: exactMatcher },
            { word: partialMatcher },
            { reading: partialMatcher },
            { meaning: partialMatcher },
        ],
    };

    const entry = await Vocabulary.findOne(query).sort({ createdAt: -1 }).lean().exec();

    if (!entry) {
        return null;
    }

    return {
        word: entry.word || normalizedTerm,
        meaning: entry.meaning || "",
        example: entry.example || "",
        reading: entry.reading || "",
        image: entry.image || "",
    };
}

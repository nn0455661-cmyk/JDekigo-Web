import { AppError } from "@/server/utils/error";
import { errorResponse, successResponse } from "@/server/utils/response";
import {
    fetchDictionarySuggestion,
    fetchGrammarContent,
    fetchKanjiContent,
    fetchReadingContent,
    fetchVocabularyContent,
} from "./content.service";

export async function grammar() {
    try {
        return successResponse(await fetchGrammarContent());
    } catch (error) {
        return errorResponse(error);
    }
}

export async function vocabulary() {
    try {
        return successResponse(await fetchVocabularyContent());
    } catch (error) {
        return errorResponse(error);
    }
}

export async function kanji() {
    try {
        return successResponse(await fetchKanjiContent());
    } catch (error) {
        return errorResponse(error);
    }
}

export async function reading() {
    try {
        return successResponse(await fetchReadingContent());
    } catch (error) {
        return errorResponse(error);
    }
}

export async function dictionarySuggest(request) {
    try {
        const { searchParams } = new URL(request.url);
        const term = String(searchParams.get("term") || "").trim();

        if (!term) {
            return errorResponse(new AppError("Missing term", 400, "TERM_REQUIRED"));
        }

        const result = await fetchDictionarySuggestion(term);
        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

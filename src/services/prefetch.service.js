import { prefetchGrammar } from "src/services/grammar.service";
import { prefetchKanji } from "src/services/kanji.service";
import { prefetchReadings, prefetchReadingByLevel } from "src/services/reading.service";
import { prefetchStudySets } from "src/services/studyset.service";
import { prefetchTests } from "src/services/test.service";
import { prefetchVocabulary } from "src/services/vocabulary.service";

const TEST_MODULES = new Set(["vocabulary", "kanji", "grammar"]);

export function prefetchModuleData(href) {
    const path = String(href || "");

    if (path.startsWith("/vocabulary")) {
        prefetchVocabulary();
        return;
    }

    if (path.startsWith("/kanji")) {
        prefetchKanji();
        return;
    }

    if (path.startsWith("/grammar")) {
        prefetchGrammar();
        return;
    }

    if (path.startsWith("/reading") || path.startsWith("/speaking")) {
        prefetchReadings();
        return;
    }

    if (path.startsWith("/study-set") || path === "/") {
        prefetchStudySets();
    }
}

export function prefetchLevelData(routeBase, level) {
    const moduleName = String(routeBase || "").replace(/^\//, "");
    const normalizedLevel = String(level || "").toUpperCase();

    if (!moduleName || !normalizedLevel) return;

    if (moduleName === "vocabulary") {
        prefetchVocabulary();
    }

    if (moduleName === "kanji") {
        prefetchKanji();
    }

    if (moduleName === "grammar") {
        prefetchGrammar();
    }

    if (moduleName === "reading") {
        prefetchReadingByLevel(normalizedLevel);
    }

    if (TEST_MODULES.has(moduleName)) {
        prefetchTests({ level: normalizedLevel, module: moduleName, status: "published" });
    }
}

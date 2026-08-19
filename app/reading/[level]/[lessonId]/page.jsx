"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, AudioLines, BookOpenText, CheckCircle2, Mic2, RotateCcw } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toHiragana as romajiToHiragana, toRomaji as kanaToRomaji } from "wanakana";
import { DEFAULT_LEVEL, normalizeLevel } from "@/constants/levels";
import RubyText from "@/components/feature/RubyText";
import LoadingState from "@/components/LoadingState";
import { readingFromInlineRubyText, stripInlineRubyText } from "@/utils/grammarQuestionBuilder";
import { saveLocalTestHistory, saveTestHistory } from "@/src/services/history.service";
import { useAuth } from "@/src/shared/hooks/useAuth";
import * as readingService from "src/services/reading.service";

const IGNORE_PATTERN = /[\s\n\r\t、。,.!?！？「」『』（）()・"'“”‘’①-⑳㊀-㊿０-９0-9]/g;

function normalizeText(value) {
    return String(value || "")
        .replace(IGNORE_PATTERN, "")
        .trim();
}

function toHiragana(value) {
    return String(value || "").replace(/[\u30A1-\u30F6]/g, (character) => {
        return String.fromCharCode(character.charCodeAt(0) - 0x60);
    });
}

function normalizeForMatch(value) {
    return toHiragana(normalizeText(value));
}

function normalizeRomajiText(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function expandFlexibleRomajiTargets(value) {
    const source = normalizeRomajiText(value);
    let targets = [""];

    for (let index = 0; index < source.length;) {
        let options = [source[index]];
        let step = 1;

        if (source.startsWith("ha", index)) {
            options = ["ha", "wa"];
            step = 2;
        } else if (source.startsWith("he", index)) {
            options = ["he", "e"];
            step = 2;
        } else if (source.startsWith("wo", index)) {
            options = ["wo", "o"];
            step = 2;
        }

        targets = targets.flatMap((target) => options.map((option) => `${target}${option}`)).slice(0, 128);
        index += step;
    }

    return Array.from(new Set(targets.filter(Boolean)));
}

function expandRomajiMacronTargets(value) {
    const replacements = [
        [/a\u0304/g, ["a", "aa"]],
        [/i\u0304/g, ["i", "ii"]],
        [/u\u0304/g, ["u", "uu"]],
        [/e\u0304/g, ["e", "ee", "ei"]],
        [/o\u0304/g, ["o", "ou", "oo"]],
    ];

    let targets = [String(value || "").normalize("NFD")];
    for (const [pattern, options] of replacements) {
        const nextTargets = [];
        for (const target of targets) {
            if (!pattern.test(target)) {
                nextTargets.push(target);
                continue;
            }

            for (const option of options) {
                nextTargets.push(target.replace(pattern, option));
            }
        }
        targets = Array.from(new Set(nextTargets));
    }

    return targets.map((target) => normalizeRomajiText(target)).filter(Boolean);
}

function expandRomajiParticleTargets(value) {
    const tokens = String(value || "").match(/[A-Za-z0-9āīūēō]+/g) || [];
    let targets = [""];

    for (const token of tokens) {
        const normalizedToken = normalizeRomajiText(token);
        const options = normalizedToken === "o"
            ? ["o", "wo"]
            : normalizedToken === "e"
                ? ["e", "he"]
                : [normalizedToken];

        targets = targets.flatMap((target) => options.map((option) => `${target}${option}`)).slice(0, 128);
    }

    return targets.map((target) => normalizeRomajiText(target)).filter(Boolean);
}

function expandCommonRomajiLearnerTargets(value) {
    const replacements = [
        [/doyobi/g, ["doyobi", "doyoubi", "doyoobi"]],
        [/ryorio/g, ["ryorio", "ryoriwo", "ryouriwo"]],
        [/ryoriwo/g, ["ryoriwo", "ryouriwo"]],
        [/ryori/g, ["ryori", "ryouri"]],
        [/juichiji/g, ["juichiji", "juuichiji"]],
    ];

    let targets = [normalizeRomajiText(value)];
    for (const [pattern, options] of replacements) {
        const nextTargets = [];
        for (const target of targets) {
            if (!target || !pattern.test(target)) {
                nextTargets.push(target);
                continue;
            }

            for (const option of options) {
                nextTargets.push(target.replace(pattern, option));
            }
        }
        targets = Array.from(new Set(nextTargets.filter(Boolean)));
    }

    return targets;
}

const ROMAJI_NUMBER_ALIASES = [
    ["gohyakuen", "500en"],
    ["hyakuen", "100en"],
    ["gohyaku", "500"],
    ["hyaku", "100"],
];

function expandRomajiNumberAliases(value) {
    const source = normalizeRomajiText(value);
    if (!source) {
        return [];
    }

    const targets = new Set([source]);
    for (const [word, number] of ROMAJI_NUMBER_ALIASES) {
        Array.from(targets).forEach((target) => {
            if (target.includes(word)) {
                targets.add(target.replaceAll(word, number));
            }
            if (target.includes(number)) {
                targets.add(target.replaceAll(number, word));
            }
        });
    }

    return Array.from(targets);
}

function expandRomajiTargets(value) {
    return Array.from(new Set([
        ...expandFlexibleRomajiTargets(value),
        ...expandRomajiMacronTargets(value),
        ...expandRomajiParticleTargets(value),
        ...expandCommonRomajiLearnerTargets(value),
    ].flatMap(expandRomajiNumberAliases)));
}

function splitChars(value) {
    return Array.from(value || "");
}

function countMatchingChars(leftChars, rightChars) {
    let count = 0;

    for (let index = 0; index < leftChars.length && index < rightChars.length; index += 1) {
        if (leftChars[index] === rightChars[index]) {
            count += 1;
        }
    }

    return count;
}

function charsMatch(leftChar, rightChar, flexibleParticles = false) {
    if (leftChar === rightChar) {
        return true;
    }

    if (!flexibleParticles) {
        return false;
    }

    return (rightChar === "は" && (leftChar === "は" || leftChar === "わ")) ||
        (rightChar === "わ" && (leftChar === "は" || leftChar === "わ")) ||
        (rightChar === "へ" && (leftChar === "へ" || leftChar === "え")) ||
        (rightChar === "え" && (leftChar === "へ" || leftChar === "え")) ||
        (rightChar === "を" && (leftChar === "を" || leftChar === "お")) ||
        (rightChar === "お" && (leftChar === "を" || leftChar === "お"));
}

function countMatchingCharsFlexible(leftChars, rightChars, flexibleParticles = false) {
    let count = 0;

    for (let index = 0; index < leftChars.length && index < rightChars.length; index += 1) {
        if (charsMatch(leftChars[index], rightChars[index], flexibleParticles)) {
            count += 1;
        }
    }

    return count;
}

function hasKana(value) {
    return /[ぁ-ゖァ-ヿ]/.test(String(value || ""));
}

function hasKanji(value) {
    return /[一-龯々〆ヶ]/.test(String(value || ""));
}

function hasRomaji(value) {
    return /[A-Za-z]/.test(String(value || ""));
}

function getMatchStats(inputText, targetText, options = {}) {
    const inputChars = splitChars(inputText);
    const targetChars = splitChars(targetText);
    return {
        text: targetText,
        chars: targetChars,
        inputLength: inputChars.length,
        matchCount: countMatchingCharsFlexible(inputChars, targetChars, options.flexibleParticles),
    };
}

function textsMatch(inputText, targetText, options = {}) {
    const inputChars = splitChars(inputText);
    const targetChars = splitChars(targetText);
    return inputChars.length === targetChars.length &&
        inputChars.every((character, index) => charsMatch(character, targetChars[index], options.flexibleParticles));
}

function getAccuracyScore(stats) {
    return stats?.inputLength ? stats.matchCount / stats.inputLength : 0;
}

function pickBestStats(statsList) {
    return statsList.filter(Boolean).reduce((bestStats, stats) => {
        if (!bestStats) {
            return stats;
        }

        const statsAccuracy = getAccuracyScore(stats);
        const bestAccuracy = getAccuracyScore(bestStats);
        if (statsAccuracy !== bestAccuracy) {
            return statsAccuracy > bestAccuracy ? stats : bestStats;
        }

        return stats.matchCount > bestStats.matchCount ? stats : bestStats;
    }, null) || { text: "", chars: [], inputLength: 0, matchCount: 0 };
}

function getReadingTargetCandidates(lesson) {
    return Array.from(new Set([
        lesson.hiraganaText,
        readingFromInlineRubyText(lesson.content || ""),
        lesson.contentWithHiragana,
        lesson.content,
    ].map((value) => normalizeForMatch(value)).filter(Boolean)));
}

function buildRomajiTargetHighlights(input, targetText) {
    let normalizedInput = "";
    let mismatchSeen = false;

    return Array.from(input).map((character, index) => {
        const normalizedCharacter = normalizeRomajiText(character);
        if (!normalizedCharacter) {
            return { character, index, status: "ignored" };
        }

        if (mismatchSeen) {
            return { character, index, status: "incorrect" };
        }

        const nextInput = `${normalizedInput}${normalizedCharacter}`;
        if (targetText.startsWith(nextInput)) {
            normalizedInput = nextInput;
            return { character, index, status: "correct" };
        }

        mismatchSeen = true;
        return { character, index, status: "incorrect" };
    });
}

function countCorrectHighlights(highlights) {
    return highlights.reduce((count, item) => item.status === "correct" ? count + 1 : count, 0);
}

function buildBestRomajiTargetHighlights(input, romajiTargets) {
    const candidates = romajiTargets.map((targetText) => buildRomajiTargetHighlights(input, targetText));
    return candidates.reduce((best, current) => (
        countCorrectHighlights(current) > countCorrectHighlights(best) ? current : best
    ), candidates[0] || []);
}

const tabButtonBase = "min-w-0 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs";
const iconTabButtonBase = `inline-flex items-center justify-center gap-1 sm:gap-2 ${tabButtonBase}`;

function tabButtonClass(isActive, palette) {
    return `${tabButtonBase} ${isActive ? palette.active : palette.inactive}`;
}

function iconTabButtonClass(isActive, palette) {
    return `${iconTabButtonBase} ${isActive ? palette.active : palette.inactive}`;
}

const tabPalettes = {
    reading: {
        active: "border-sky-500 bg-sky-100 text-sky-700",
        inactive: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    },
    romaji: {
        active: "border-orange-500 bg-orange-100 text-orange-700",
        inactive: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
    },
    meaning: {
        active: "border-emerald-500 bg-emerald-100 text-emerald-700",
        inactive: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    audio: {
        active: "border-rose-500 bg-rose-100 text-rose-700",
        inactive: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    },
};

export default function ReadingLessonTypingPage() {
    const { user } = useAuth();
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();

    const rawLevel = String(params?.level || DEFAULT_LEVEL).toUpperCase();
    const level = normalizeLevel(rawLevel);
    const lessonId = String(params?.lessonId || "");
    const isSpeakingReading = pathname?.startsWith("/speaking/");
    const listRoute = isSpeakingReading ? `/speaking/${level}/reading` : `/reading/${level}`;

    const [items, setItems] = useState(() => {
        const cached = readingService.getCachedReadingByLevel(level) || readingService.getCachedReadings();
        return Array.isArray(cached?.data?.data) ? cached.data.data : [];
    });
    const [loading, setLoading] = useState(() => !(readingService.getCachedReadingByLevel(level) || readingService.getCachedReadings()));
    const [userInput, setUserInput] = useState("");
    const [showMeaning, setShowMeaning] = useState(false);
    const [showReading, setShowReading] = useState(false);
    const [showRomaji, setShowRomaji] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const savedResultRef = useRef(false);
    const typingBackdropRef = useRef(null);

    useEffect(() => {
        if (rawLevel !== level) {
            router.replace(isSpeakingReading ? `/speaking/${level}/reading/${lessonId}` : `/reading/${level}/${lessonId}`);
            return;
        }

        const fetchReading = async () => {
            try {
                const result = await readingService.getReadingByLevel(level);
                setItems(Array.isArray(result?.data?.data) ? result.data.data : []);
            } finally {
                setLoading(false);
            }
        };

        fetchReading();
    }, [rawLevel, level, lessonId, router, isSpeakingReading]);

    const lesson = useMemo(() => {
        return items.find((item) => item.level === level && String(item.id) === lessonId) || null;
    }, [items, level, lessonId]);

    const targetOptions = useMemo(() => {
        if (!lesson) {
            return {
                kanjiTarget: "",
                readingTarget: "",
                readingTargets: [],
                romajiTarget: "",
                romajiTargets: [],
                allTargets: [],
            };
        }
        const kanjiText = normalizeForMatch(stripInlineRubyText(lesson.content || ""));
        const readingTargets = getReadingTargetCandidates(lesson);
        const readingText = readingTargets[0] || "";
        const romajiText = normalizeRomajiText(lesson.romaji);
        const romajiTargets = Array.from(new Set([
            ...expandRomajiTargets(romajiText),
            ...readingTargets.flatMap((targetText) => expandRomajiTargets(kanaToRomaji(targetText))),
        ].filter(Boolean)));

        return {
            kanjiTarget: kanjiText,
            readingTarget: readingText,
            readingTargets,
            romajiTarget: romajiText,
            romajiTargets,
            allTargets: Array.from(new Set([kanjiText, ...readingTargets, romajiText].filter(Boolean))),
        };
    }, [lesson]);

    const targetVariants = targetOptions.allTargets;

    const inputText = useMemo(() => normalizeForMatch(userInput), [userInput]);

    const romajiInput = useMemo(() => normalizeRomajiText(userInput), [userInput]);

    const romajiAsHiraganaInput = useMemo(() => {
        return normalizeForMatch(romajiToHiragana(userInput));
    }, [userInput]);

    const isRomajiInput = useMemo(() => {
        return hasRomaji(userInput) && !hasKana(userInput) && !hasKanji(userInput);
    }, [userInput]);

    const preferredTarget = useMemo(() => {
        if (!targetVariants.length) {
            return { text: "", chars: [], inputLength: 0, matchCount: 0 };
        }

        const { kanjiTarget, readingTarget, readingTargets, romajiTargets } = targetOptions;
        const kanaInput = hasKana(inputText);
        const kanjiInput = hasKanji(inputText);

        if (isRomajiInput) {
            return pickBestStats([
                ...readingTargets.map((targetText) => getMatchStats(romajiAsHiraganaInput, targetText, { flexibleParticles: true })),
                ...romajiTargets.map((targetText) => getMatchStats(romajiInput, targetText)),
            ]);
        }

        if (kanaInput && !kanjiInput) {
            return getMatchStats(inputText, readingTarget || kanjiTarget);
        }

        if (kanjiInput && !kanaInput) {
            return getMatchStats(inputText, kanjiTarget || readingTarget);
        }

        const readingStats = readingTarget ? getMatchStats(inputText, readingTarget) : null;
        const kanjiStats = kanjiTarget ? getMatchStats(inputText, kanjiTarget) : null;

        if (!readingStats) {
            return kanjiStats || { text: "", chars: [], matchCount: 0 };
        }

        if (!kanjiStats) {
            return readingStats;
        }

        return readingStats.matchCount >= kanjiStats.matchCount ? readingStats : kanjiStats;
    }, [inputText, isRomajiInput, romajiAsHiraganaInput, romajiInput, targetOptions, targetVariants.length]);

    const matchCount = preferredTarget.matchCount;

    const progress = useMemo(() => {
        if (!preferredTarget.chars.length) {
            return 0;
        }
        return Math.min(100, Math.round((Math.min(preferredTarget.inputLength, preferredTarget.chars.length) / preferredTarget.chars.length) * 100));
    }, [preferredTarget.chars.length, preferredTarget.inputLength]);

    const accuracy = useMemo(() => {
        if (!preferredTarget.inputLength) {
            return 0;
        }
        return Math.round((matchCount / preferredTarget.inputLength) * 100);
    }, [matchCount, preferredTarget.inputLength]);

    const completed =
        targetVariants.length > 0 &&
        (targetVariants.some((targetText) => targetText === inputText) ||
            (isRomajiInput && (
                targetOptions.readingTarget === romajiAsHiraganaInput ||
                targetOptions.readingTargets.some((targetText) => textsMatch(romajiAsHiraganaInput, targetText, { flexibleParticles: true })) ||
                targetOptions.romajiTargets.some((targetText) => targetText === romajiInput)
            )));

    const highlightedInput = useMemo(() => {
        if (isRomajiInput) {
            return buildBestRomajiTargetHighlights(userInput, targetOptions.romajiTargets);
        }

        let comparableIndex = 0;
        return Array.from(userInput).map((character, index) => {
            const normalizedCharacter = normalizeForMatch(character);
            if (!normalizedCharacter) {
                return { character, index, status: "ignored" };
            }

            const isCorrect = charsMatch(normalizedCharacter, preferredTarget.chars[comparableIndex], false);
            comparableIndex += 1;
            return { character, index, status: isCorrect ? "correct" : "incorrect" };
        });
    }, [isRomajiInput, preferredTarget.chars, targetOptions.romajiTargets, userInput]);

    const hasTypedAnswer = highlightedInput.some((item) => item.status === "correct" || item.status === "incorrect");
    const hasMistake = highlightedInput.some((item) => item.status === "incorrect");
    const highlightedTypedCount = highlightedInput.filter((item) => item.status !== "ignored").length;
    const highlightedCorrectCount = highlightedInput.filter((item) => item.status === "correct").length;
    const displayCorrectCount = highlightedTypedCount ? highlightedCorrectCount : matchCount;
    const displayAccuracy = highlightedTypedCount ? Math.round((highlightedCorrectCount / highlightedTypedCount) * 100) : accuracy;
    const typingBorderClass = completed || (hasTypedAnswer && !hasMistake)
        ? "border-emerald-500"
        : hasMistake
            ? "border-rose-400"
            : "border-[var(--color-border)] focus-within:border-[var(--color-primary)]";

    useEffect(() => {
        if (!completed || !lesson || savedResultRef.current) {
            return;
        }

        const saveProcess = async () => {
            const historyItem = {
                type: "typing",
                level,
                testId: lessonId,
                testTitle: `Luyện gõ - ${lesson.title}`,
                title: `Luyện gõ - ${lesson.title}`,
                correct: matchCount,
                total: preferredTarget.chars.length,
                percentage: Math.round((matchCount / Math.max(1, preferredTarget.chars.length)) * 100),
                durationSeconds: 0,
            };

            if (user) {
                try {
                    await saveTestHistory({
                        module: "reading",
                        ...historyItem,
                    });
                } catch (err) {
                    saveLocalTestHistory("reading", level, historyItem);
                }
            } else {
                saveLocalTestHistory("reading", level, historyItem);
            }

            savedResultRef.current = true;
        };

        saveProcess();
    }, [completed, lesson, lessonId, level, matchCount, preferredTarget.chars.length, user]);

    const resetTyping = () => {
        setUserInput("");
        savedResultRef.current = false;
    };

    const getSpeakText = () => {
        if (!lesson) {
            return "";
        }
        const contentWithHiragana = String(lesson.contentWithHiragana || "").trim();
        if (contentWithHiragana) {
            return stripInlineRubyText(contentWithHiragana).trim();
        }

        const readingText = readingFromInlineRubyText(lesson.content || "");
        if (readingText) {
            return String(readingText).trim();
        }

        return stripInlineRubyText(lesson.content || "").trim();
    };

    const handleToggleSpeak = () => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
            return;
        }

        const synth = window.speechSynthesis;
        if (isSpeaking) {
            synth.cancel();
            setIsSpeaking(false);
            return;
        }

        const text = getSpeakText();
        if (!text) {
            return;
        }

        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ja-JP";
        utterance.rate = 1;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        synth.speak(utterance);
    };

    useEffect(() => {
        return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    if (loading) {
        return (
            <section className="dashboard-shell p-4 sm:p-5">
                <LoadingState message="Đang tải bài đọc..." />
            </section>
        );
    }

    if (!lesson) {
        return (
            <section className="dashboard-shell space-y-4 p-4 sm:p-5">
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-3 text-sm text-[var(--color-text-soft)]">
                    Không tìm thấy bài đọc.
                </p>
                <Link
                    href={listRoute}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-reading-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-reading)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </section>
        );
    }

    return (
        <section className="dashboard-shell space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="section-title">
                        <RubyText text={lesson.title} showFurigana={isSpeakingReading ? true : showReading} />
                    </h1>
                    <p className="text-sm text-[var(--color-text-soft)]">{level} - Luyện gõ Hiragana</p>
                </div>
                <Link
                    href={listRoute}
                    className="back-action inline-flex items-center gap-2 rounded-xl border border-transparent bg-[var(--icon-reading-bg)] px-3 py-2 text-sm font-semibold text-[var(--icon-reading)] transition hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="back-label">Quay lại</span>
                </Link>
            </div>

            {isSpeakingReading ? (
                <div className="inline-flex w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] sm:w-auto">
                    <Link
                        href={`/speaking/${level}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-primary)] sm:flex-none"
                    >
                        <Mic2 className="h-4 w-4" />
                        Phần nói
                    </Link>
                    <Link
                        href={`/speaking/${level}/reading`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white sm:flex-none"
                    >
                        <BookOpenText className="h-4 w-4" />
                        Luyện đọc
                    </Link>
                </div>
            ) : null}

            <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
                <div className="space-y-3">
                    <div className="grid grid-cols-4 items-center gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                        <button
                            type="button"
                            onClick={() => setShowReading((prev) => !prev)}
                            className={tabButtonClass(showReading, tabPalettes.reading)}
                        >
                            Cách đọc
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowRomaji((prev) => !prev)}
                            className={tabButtonClass(showRomaji, tabPalettes.romaji)}
                        >
                            Romaji
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowMeaning((prev) => !prev)}
                            className={tabButtonClass(showMeaning, tabPalettes.meaning)}
                        >
                            Dịch
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleSpeak}
                            className={iconTabButtonClass(isSpeaking, tabPalettes.audio)}
                            aria-pressed={isSpeaking}
                        >
                            <AudioLines className="h-3.5 w-3.5" />
                            {isSpeaking ? "Dừng" : "Nghe"}
                        </button>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-soft)]">Nội dung gốc</p>
                        <RubyText
                            text={lesson.content}
                            className="mt-2 whitespace-pre-line text-base leading-relaxed text-[var(--color-text)]"
                            rtClassName="text-[10px] text-[var(--color-text-soft)]"
                            highlightQuotedText
                            showFurigana={showReading}
                        />
                    </div>

                    {showRomaji ? (
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                            <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-orange-700">
                                {lesson.romaji || "Chưa có romaji."}
                            </p>
                        </div>
                    ) : null}

                    {showMeaning ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-emerald-700">
                                {lesson.translation || "Chưa có nghĩa tiếng Việt."}
                            </p>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <label htmlFor="typing-input" className="text-sm font-semibold text-[var(--color-text)]">
                        Khung gõ Romaji, Kanji hoặc Hiragana của bạn
                    </label>
                    <div className={`relative w-full max-w-full overflow-hidden rounded-xl border bg-[var(--color-surface)] transition ${typingBorderClass}`}>
                        <div
                            ref={typingBackdropRef}
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 box-border min-h-[130px] overflow-hidden whitespace-pre-wrap break-words px-3 py-2 text-sm font-semibold leading-normal"
                        >
                            {highlightedInput.map(({ character, index, status }) => (
                                <span
                                    key={`${index}-${character}`}
                                    className={status === "incorrect" ? "font-semibold text-rose-600" : status === "ignored" ? "text-[var(--color-text-soft)]" : "font-semibold text-emerald-600"}
                                >
                                    {character}
                                </span>
                            ))}
                        </div>
                        <textarea
                            id="typing-input"
                            value={userInput}
                            onChange={(event) => setUserInput(event.target.value)}
                            onScroll={(event) => {
                                if (typingBackdropRef.current) {
                                    typingBackdropRef.current.scrollTop = event.currentTarget.scrollTop;
                                    typingBackdropRef.current.scrollLeft = event.currentTarget.scrollLeft;
                                }
                            }}
                            className="relative z-10 block box-border min-h-[130px] w-full max-w-full resize-y bg-transparent px-3 py-2 text-sm font-semibold leading-normal text-transparent no-underline caret-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)]"
                            placeholder="Nhập romaji, kanji hoặc hiragana tại đây..."
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoComplete="off"
                            data-gramm="false"
                            data-gramm_editor="false"
                            data-enable-grammarly="false"
                            data-ms-editor="false"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text)] sm:grid-cols-3">
                    <p>Tiến độ: <span className="font-semibold">{progress}%</span></p>
                    <p>Đúng ký tự: <span className="font-semibold">{displayCorrectCount}/{preferredTarget.chars.length}</span></p>
                    <p>Độ chính xác: <span className="font-semibold">{displayAccuracy}%</span></p>
                </div>

                {completed ? (
                    <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Bạn đã hoàn thành lượt luyện gõ bài này.
                    </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={resetTyping}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-soft)] transition hover:bg-[var(--color-bg-soft)]"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Gõ lại từ đầu
                    </button>
                </div>
            </div>
        </section>
    );
}

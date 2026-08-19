"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, AudioLines, BookOpenText, CheckCircle2, Eye, EyeOff, Mic2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { toHiragana as romajiToHiragana, toRomaji as kanaToRomaji } from "wanakana";
import RubyText from "@/components/feature/RubyText";
import LoadingState from "@/components/LoadingState";
import { readingFromInlineRubyText, stripInlineRubyText } from "@/utils/grammarQuestionBuilder";
import { getCachedSpeakingLevel, listSpeakingLevel } from "@/src/services/speaking.service";

const IGNORED_TYPING_CHARACTERS = /[\s\n\r\t、。,.!?！？」「『』（）()・"'“”‘’0-9０-９①-⑳]/g;

function normalizeTypingText(value) {
    return Array.from(String(value || "").replace(IGNORED_TYPING_CHARACTERS, ""), (character) => {
        const code = character.charCodeAt(0);
        return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : character;
    }).join("");
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

function hasKana(value) {
    return /[ぁ-ゖァ-ヿ]/.test(String(value || ""));
}

function hasKanji(value) {
    return /[一-龯々〆ヶ]/.test(String(value || ""));
}

function hasRomaji(value) {
    return /[A-Za-z]/.test(String(value || ""));
}

function charsMatch(leftChar, rightChar, flexibleParticles = false) {
    if (leftChar === rightChar) return true;

    if (!flexibleParticles) return false;

    return (rightChar === "は" && (leftChar === "は" || leftChar === "わ")) ||
        (rightChar === "わ" && (leftChar === "は" || leftChar === "わ")) ||
        (rightChar === "へ" && (leftChar === "へ" || leftChar === "え")) ||
        (rightChar === "え" && (leftChar === "へ" || leftChar === "え")) ||
        (rightChar === "を" && (leftChar === "を" || leftChar === "お")) ||
        (rightChar === "お" && (leftChar === "を" || leftChar === "お"));
}

function getMatchCount(inputText, targetText, options = {}) {
    const inputCharacters = Array.from(inputText);
    const targetCharacters = Array.from(targetText);
    return inputCharacters.reduce((count, character, index) => (
        charsMatch(character, targetCharacters[index], options.flexibleParticles) ? count + 1 : count
    ), 0);
}

function getMatchStats(inputText, targetText, mode, options = {}) {
    return {
        text: targetText,
        mode,
        inputLength: Array.from(inputText).length,
        matchCount: getMatchCount(inputText, targetText, options),
    };
}

function textsMatch(inputText, targetText, options = {}) {
    const inputCharacters = Array.from(inputText);
    const targetCharacters = Array.from(targetText);
    return inputCharacters.length === targetCharacters.length &&
        inputCharacters.every((character, index) => charsMatch(character, targetCharacters[index], options.flexibleParticles));
}

function textPrefixMatches(inputText, targetText, options = {}) {
    const inputCharacters = Array.from(inputText);
    const targetCharacters = Array.from(targetText);
    if (inputCharacters.length > targetCharacters.length) return false;

    return inputCharacters.every((character, index) => charsMatch(character, targetCharacters[index], options.flexibleParticles));
}

function getAccuracyScore(stats) {
    return stats?.inputLength ? stats.matchCount / stats.inputLength : 0;
}

function pickBestStats(statsList) {
    return statsList.filter(Boolean).reduce((bestStats, stats) => {
        if (!bestStats) return stats;
        const statsAccuracy = getAccuracyScore(stats);
        const bestAccuracy = getAccuracyScore(bestStats);
        if (statsAccuracy !== bestAccuracy) {
            return statsAccuracy > bestAccuracy ? stats : bestStats;
        }
        return stats.matchCount > bestStats.matchCount ? stats : bestStats;
    }, null) || { text: "", mode: "kana", inputLength: 0, matchCount: 0 };
}

function getReadingTargetCandidates(item) {
    return Array.from(new Set([
        item.hiraganaText,
        readingFromInlineRubyText(item.content || ""),
        item.contentWithHiragana,
        item.content,
    ].map((value) => normalizeTypingText(value)).filter(Boolean)));
}

function getRomajiPrefixStatus(prefix, romajiTarget, romajiTargets, hiraganaTargets) {
    const normalizedPrefix = normalizeRomajiText(prefix);
    if (!normalizedPrefix) {
        return "ignored";
    }

    if ((romajiTarget && romajiTarget.startsWith(normalizedPrefix)) || romajiTargets.some((targetText) => targetText.startsWith(normalizedPrefix))) {
        return "correct";
    }

    const kanaPrefix = normalizeTypingText(romajiToHiragana(prefix));
    if (hasRomaji(kanaPrefix)) {
        return "pending";
    }

    return hiraganaTargets.some((targetText) => textPrefixMatches(kanaPrefix, targetText, { flexibleParticles: true }))
        ? "correct"
        : "incorrect";
}

function getValidRomajiPrefixLength(input, romajiTarget, romajiTargets, hiraganaTargets) {
    let validLength = 0;

    for (let index = 0; index < input.length; index += 1) {
        const character = input[index];
        if (!normalizeRomajiText(character)) {
            validLength = index + 1;
            continue;
        }

        const status = getRomajiPrefixStatus(input.slice(0, index + 1), romajiTarget, romajiTargets, hiraganaTargets);
        if (status !== "correct") {
            break;
        }

        validLength = index + 1;
    }

    return validLength;
}

function getRomajiSegmentStatuses(segment, targetText) {
    let hasError = false;

    return Array.from(segment).map((character, index) => {
        if (!normalizeRomajiText(character)) {
            return "ignored";
        }

        if (hasError) {
            return "incorrect";
        }

        const beforeKana = normalizeTypingText(romajiToHiragana(segment.slice(0, index)));
        const afterKana = normalizeTypingText(romajiToHiragana(segment.slice(0, index + 1)));
        if (hasRomaji(afterKana)) {
            const beforeOk = textPrefixMatches(beforeKana, targetText, { flexibleParticles: true });
            if (beforeOk) {
                return "correct";
            }
            hasError = true;
            return "incorrect";
        }

        const afterOk = textPrefixMatches(afterKana, targetText, { flexibleParticles: true });
        if (afterOk) {
            return "correct";
        }

        hasError = true;
        return "incorrect";
    });
}

function buildRomajiLockedHighlights(input, targetText) {
    const highlights = [];
    let targetIndex = 0;
    let index = 0;

    while (index < input.length) {
        const character = input[index];
        if (/\s/.test(character)) {
            highlights.push({ character, index, status: "ignored" });
            index += 1;
            continue;
        }

        const startIndex = index;
        while (index < input.length && !/\s/.test(input[index])) {
            index += 1;
        }

        const segment = input.slice(startIndex, index);
        const targetSlice = targetText.slice(targetIndex);
        const segmentStatuses = getRomajiSegmentStatuses(segment, targetSlice);
        Array.from(segment).forEach((segmentCharacter, segmentIndex) => {
            highlights.push({
                character: segmentCharacter,
                index: startIndex + segmentIndex,
                status: segmentStatuses[segmentIndex],
            });
        });

        const segmentKana = normalizeTypingText(romajiToHiragana(segment));
        if (!hasRomaji(segmentKana) && textPrefixMatches(segmentKana, targetSlice, { flexibleParticles: true })) {
            targetIndex += Array.from(segmentKana).length;
        }
    }

    return highlights;
}

function countHighlightScore(highlights) {
    return highlights.reduce((score, item) => {
        if (item.status === "correct") return score + 2;
        if (item.status === "incorrect") return score - 2;
        if (item.status === "pending") return score - 1;
        return score;
    }, 0);
}

function buildBestRomajiLockedHighlights(input, hiraganaTargets) {
    const candidates = hiraganaTargets.map((targetText) => buildRomajiLockedHighlights(input, targetText));
    return candidates.reduce((best, current) => (
        countHighlightScore(current) > countHighlightScore(best) ? current : best
    ), candidates[0] || []);
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

function formatTime(value) {
    if (!Number.isFinite(value) || value <= 0) return "0:00";
    return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

const readingTagClass = "min-w-0 whitespace-nowrap rounded-lg border border-sky-300 bg-sky-100 px-2 py-1.5 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-200 sm:px-3 sm:text-sm";
const romajiTagClass = "min-w-0 whitespace-nowrap rounded-lg border border-orange-300 bg-orange-100 px-2 py-1.5 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-200 sm:px-3 sm:text-sm";
const translationTagClass = "min-w-0 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-200 sm:px-3 sm:text-sm";
const audioTagClass = "inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-rose-300 bg-rose-100 px-2 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-200 sm:gap-2 sm:px-3 sm:text-sm";

function AudioControl({ src, action = null }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-3 py-2">
            <audio ref={audioRef} src={src} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)} />
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => playing ? audioRef.current?.pause() : audioRef.current?.play()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                <div className="min-w-0 flex-1"><input type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || currentTime)} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="w-full accent-[var(--color-primary)]" /><div className="flex justify-between text-xs text-[var(--color-text-soft)]"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div>
                <Volume2 className="h-4 w-4 text-[var(--color-text-soft)]" />
                {action}
            </div>
        </div>
    );
}

function CompactAudioButton({ src }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);

    useEffect(() => () => audioRef.current?.pause(), []);

    const toggleAudio = () => {
        if (playing) {
            audioRef.current?.pause();
            return;
        }
        void audioRef.current?.play();
    };

    return (
        <>
            <audio ref={audioRef} src={src} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
            <button type="button" onClick={toggleAudio} className={audioTagClass}>
                {playing ? <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <AudioLines className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                {playing ? "Dừng" : "Nghe"}
            </button>
        </>
    );
}

function SpeakingItem({ item }) {
    const [showScript, setShowScript] = useState(false);
    return (
        <article className="grid overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] md:grid-cols-2">
            <div className="min-h-52 bg-[var(--color-bg-soft)] md:aspect-[4/3]">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center"><Mic2 className="h-10 w-10 text-[var(--color-primary)]" /></div>}</div>
            <div className="flex flex-col justify-start gap-3 p-4"><AudioControl src={item.audioUrl} action={item.scriptEnabled !== false && item.script ? <button type="button" onClick={() => setShowScript((value) => !value)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]" title={showScript ? "Ẩn script" : "Hiện script"}>{showScript ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button> : null} />{showScript ? <p className="whitespace-pre-line rounded-xl bg-[var(--color-bg-soft)] p-3 text-base leading-relaxed text-[var(--color-text)] sm:p-4 sm:text-lg"><RubyText text={item.script} /></p> : null}</div>
        </article>
    );
}

function ReadingItem({ item }) {
    const typingBackdropRef = useRef(null);
    const [showReading, setShowReading] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);
    const [showRomaji, setShowRomaji] = useState(false);
    const [input, setInput] = useState("");
    const targetOptions = useMemo(() => {
        const kanjiTarget = normalizeTypingText(stripInlineRubyText(item.content || ""));
        const hiraganaTargets = getReadingTargetCandidates(item);
        const hiraganaTarget = hiraganaTargets[0] || "";
        const romajiTarget = normalizeRomajiText(item.romaji);
        const romajiTargets = Array.from(new Set([
            ...expandRomajiTargets(romajiTarget),
            ...hiraganaTargets.flatMap((targetText) => expandRomajiTargets(kanaToRomaji(targetText))),
        ].filter(Boolean)));
        return {
            kanjiTarget,
            hiraganaTarget,
            hiraganaTargets,
            romajiTarget,
            romajiTargets,
            allTargets: Array.from(new Set([kanjiTarget, ...hiraganaTargets, romajiTarget].filter(Boolean))),
        };
    }, [item]);
    const targetVariants = targetOptions.allTargets;
    const typedAsRomaji = useMemo(() => (
        hasRomaji(input) && !hasKana(input) && !hasKanji(input)
    ), [input]);
    const normalizedKanaInput = useMemo(() => normalizeTypingText(input), [input]);
    const normalizedRomajiInput = useMemo(() => normalizeRomajiText(input), [input]);
    const romajiAsHiraganaInput = useMemo(() => normalizeTypingText(romajiToHiragana(input)), [input]);
    const expectedStats = useMemo(() => {
        if (!targetVariants.length) return { text: "", mode: "kana", inputLength: 0, matchCount: 0 };
        if (typedAsRomaji) {
            return pickBestStats([
                ...targetOptions.hiraganaTargets.map((targetText) => getMatchStats(romajiAsHiraganaInput, targetText, "kana", { flexibleParticles: true })),
                ...targetOptions.romajiTargets.map((targetText) => getMatchStats(normalizedRomajiInput, targetText, "romaji")),
            ]);
        }
        return targetVariants.reduce((bestStats, target) => {
            const stats = getMatchStats(normalizedKanaInput, target, "kana");
            return stats.matchCount > bestStats.matchCount ? stats : bestStats;
        }, getMatchStats(normalizedKanaInput, targetVariants[0], "kana"));
    }, [normalizedKanaInput, normalizedRomajiInput, romajiAsHiraganaInput, targetOptions, targetVariants, typedAsRomaji]);
    const expected = expectedStats.text;
    const expectedCharacters = useMemo(() => Array.from(expected), [expected]);
    const correctCount = expectedStats.matchCount;
    const progress = expectedCharacters.length
        ? Math.min(100, Math.round((Math.min(expectedStats.inputLength, expectedCharacters.length) / expectedCharacters.length) * 100))
        : 0;
    const accuracy = expectedStats.inputLength ? Math.round((correctCount / expectedStats.inputLength) * 100) : 0;
    const completed = targetVariants.some((target) => normalizedKanaInput === target) ||
        (typedAsRomaji && (
            targetOptions.hiraganaTarget === romajiAsHiraganaInput ||
            targetOptions.hiraganaTargets.some((targetText) => textsMatch(romajiAsHiraganaInput, targetText, { flexibleParticles: true })) ||
            targetOptions.romajiTargets.some((targetText) => targetText === normalizedRomajiInput)
        ));
    const highlightedInput = useMemo(() => {
        if (typedAsRomaji) {
            return buildBestRomajiTargetHighlights(input, targetOptions.romajiTargets);
        }

        let comparableIndex = 0;
        return Array.from(input).map((character, index) => {
            const normalizedCharacter = normalizeTypingText(character);
            if (!normalizedCharacter) {
                return { character, index, status: "ignored" };
            }

            const isCorrect = normalizedCharacter === expectedCharacters[comparableIndex];
            comparableIndex += 1;
            return { character, index, status: isCorrect ? "correct" : "incorrect" };
        });
    }, [expectedCharacters, input, targetOptions, typedAsRomaji]);
    const hasTypedAnswer = highlightedInput.some((item) => item.status === "correct" || item.status === "incorrect" || item.status === "pending");
    const hasMistake = highlightedInput.some((item) => item.status === "incorrect" || item.status === "pending");
    const highlightedTypedCount = highlightedInput.filter((item) => item.status !== "ignored").length;
    const highlightedCorrectCount = highlightedInput.filter((item) => item.status === "correct").length;
    const displayCorrectCount = highlightedTypedCount ? highlightedCorrectCount : correctCount;
    const displayAccuracy = highlightedTypedCount ? Math.round((highlightedCorrectCount / highlightedTypedCount) * 100) : accuracy;
    const typingBorderClass = completed || (hasTypedAnswer && !hasMistake)
        ? "border-emerald-500"
        : hasMistake
            ? "border-rose-400"
            : "border-[var(--color-border)] focus-within:border-[var(--color-primary)]";
    const speak = () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(expected);
        utterance.lang = "ja-JP";
        window.speechSynthesis.speak(utterance);
    };
    return (
        <article className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                <h2 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">
                    <RubyText text={item.title} />
                </h2>
                <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto sm:flex sm:flex-wrap sm:gap-2">
                    <button type="button" onClick={() => setShowReading((value) => !value)} className={readingTagClass}>Cách đọc</button>
                    <button type="button" onClick={() => setShowRomaji((value) => !value)} className={romajiTagClass}>Romaji</button>
                    <button type="button" onClick={() => setShowTranslation((value) => !value)} className={translationTagClass}>Dịch</button>
                    {item.audioUrl ? (
                        <CompactAudioButton src={item.audioUrl} />
                    ) : (
                        <button type="button" onClick={speak} className={audioTagClass}>
                            <AudioLines className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Nghe
                        </button>
                    )}
                </div>
            </div>
            <RubyText text={item.content} showFurigana={showReading} highlightQuotedText className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)] sm:text-lg sm:leading-loose" rtClassName="text-[8px] text-[var(--color-text-soft)] sm:text-xs" />
            {showRomaji ? <p className="whitespace-pre-line rounded-xl border border-orange-200 bg-orange-50 p-3 text-base font-semibold text-orange-700">{item.romaji || "Chưa có romaji."}</p> : null}
            {showTranslation ? <p className="whitespace-pre-line rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-base font-semibold text-emerald-700">{item.translation || "Chưa có bản dịch."}</p> : null}
            <div>
                <label className="text-sm font-semibold text-[var(--color-text)]">Luyện gõ Romaji, Kanji hoặc Hiragana</label>
                <div className={`relative mt-2 w-full max-w-full overflow-hidden rounded-xl border bg-[var(--color-surface)] transition ${typingBorderClass}`}>
                    <div
                        ref={typingBackdropRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 box-border min-h-[190px] overflow-hidden whitespace-pre-wrap break-words p-3 text-[10px] font-semibold leading-4 sm:min-h-[220px] sm:text-sm sm:leading-normal"
                    >
                        {highlightedInput.map(({ character, index, status }) => (
                            <span
                                key={`${index}-${character}`}
                                className={status === "incorrect" || status === "pending" ? "font-semibold text-rose-600" : status === "ignored" ? "text-[var(--color-text-soft)]" : "font-semibold text-emerald-600"}
                            >
                                {character}
                            </span>
                        ))}
                    </div>
                    <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onScroll={(event) => {
                            if (typingBackdropRef.current) {
                                typingBackdropRef.current.scrollTop = event.currentTarget.scrollTop;
                                typingBackdropRef.current.scrollLeft = event.currentTarget.scrollLeft;
                            }
                        }}
                        rows={7}
                        placeholder="Nhập Romaji, Kanji hoặc Hiragana tại đây..."
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        autoComplete="off"
                        data-gramm="false"
                        data-gramm_editor="false"
                        data-enable-grammarly="false"
                        data-ms-editor="false"
                        className="relative z-10 block box-border min-h-[190px] w-full max-w-full resize-y bg-transparent p-3 text-[10px] font-semibold leading-4 text-transparent no-underline caret-[var(--color-text)] outline-none placeholder:text-[var(--color-text-soft)] sm:min-h-[220px] sm:text-sm sm:leading-normal"
                    />
                </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text)] sm:grid-cols-3">
                <p>Tiến độ: <span className="font-semibold">{progress}%</span></p>
                <p>Đúng ký tự: <span className="font-semibold">{displayCorrectCount}/{expectedCharacters.length}</span></p>
                <p>Độ chính xác: <span className="font-semibold">{displayAccuracy}%</span></p>
            </div>

            <div className="flex items-center gap-2">{completed ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Hoàn thành</span> : null}<button type="button" onClick={() => setInput("")} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"><RotateCcw className="h-4 w-4" />Gõ lại</button></div>
        </article>
    );
}

export default function SpeakingSetPage(props) {
    const params = use(props.params);
    const level = String(params?.level || "JPD113").toUpperCase();
    const setId = String(params?.setId || "");
    const [setItem, setSetItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("speaking");

    useEffect(() => {
        let mounted = true;

        const applyItems = (items) => {
            setSetItem(items.find((item) => String(item.id || item._id) === setId) || null);
        };

        const cachedItems = getCachedSpeakingLevel(level);
        if (Array.isArray(cachedItems)) {
            applyItems(cachedItems);
            setLoading(false);
        } else {
            setLoading(true);
        }

        listSpeakingLevel(level)
            .then((items) => {
                if (mounted) applyItems(items);
            })
            .catch(() => {
                if (mounted) setSetItem(null);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [level, setId]);

    const speakingItems = setItem && Array.isArray(setItem.speakingItems) && setItem.speakingItems.length ? setItem.speakingItems : setItem?.audioUrl ? [setItem] : [];
    const readingItems = Array.isArray(setItem?.readingItems) ? setItem.readingItems : [];

    if (loading) return <section className="dashboard-shell p-5"><LoadingState message="Đang tải đề..." /></section>;
    if (!setItem) return <section className="dashboard-shell space-y-3 p-5"><p>Không tìm thấy đề.</p><Link href={`/speaking/${level}`} className="text-[var(--color-primary)]">Quay lại</Link></section>;

    return (
        <section className="dashboard-shell space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--color-primary)]">Speaking - {level}</p><h1 className="section-title">{setItem.title}</h1></div><Link href={`/speaking/${level}`} className="back-action inline-flex items-center gap-2 rounded-xl bg-[var(--icon-speaking-bg)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)]"><ArrowLeft className="h-4 w-4" /><span className="back-label">Quay lại</span></Link></div>
            <div className="inline-flex w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 sm:w-auto"><button type="button" onClick={() => setTab("speaking")} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${tab === "speaking" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-soft)]"}`}><Mic2 className="h-4 w-4" />Phần nói</button><button type="button" onClick={() => setTab("reading")} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${tab === "reading" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-soft)]"}`}><BookOpenText className="h-4 w-4" />Phần đọc</button></div>
            <div className="grid gap-4">{tab === "speaking" ? speakingItems.length ? speakingItems.map((item, index) => <SpeakingItem key={item._id || index} item={item} />) : <p className="text-sm text-[var(--color-text-soft)]">Đề này chưa có bài nói.</p> : readingItems.length ? readingItems.map((item, index) => <ReadingItem key={item._id || index} item={item} />) : <p className="text-sm text-[var(--color-text-soft)]">Đề này chưa có bài đọc.</p>}</div>
        </section>
    );
}

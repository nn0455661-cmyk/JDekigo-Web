export function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeArrangeText(value) {
    return stripInlineRubyText(repairMojibakeText(value))
        .normalize("NFKC")
        .replace(/[。、，,.!?！？]/g, "")
        .replace(/[\s\u3000]+/g, "");
}

function normalizeArrangeToken(value) {
    return stripInlineRubyText(repairMojibakeText(value))
        .normalize("NFKC")
        .replace(/[。、，,.!?！？]/g, "")
        .replace(/[\s\u3000]+/g, "")
        .trim();
}

function tokenizeArrangeAnswer(value) {
    return stripInlineRubyText(repairMojibakeText(value))
        .normalize("NFKC")
        .split(/[\s\u3000]+/)
        .map(normalizeArrangeToken)
        .filter(Boolean);
}

function canonicalizeToListTokens(tokens) {
    const next = [...tokens];

    for (let index = 1; index < next.length - 1; index += 1) {
        if (next[index] !== "と") {
            continue;
        }

        const pair = [next[index - 1], next[index + 1]].sort((left, right) => left.localeCompare(right, "ja"));
        next[index - 1] = pair[0];
        next[index + 1] = pair[1];
    }

    return next;
}

function canonicalizeSingleToListText(value) {
    const text = normalizeArrangeText(value);
    const toIndex = text.indexOf("と");

    if (toIndex <= 0 || toIndex >= text.length - 1) {
        return "";
    }

    const beforeTo = text.slice(0, toIndex);
    const afterTo = text.slice(toIndex + 1);
    const particleIndex = Math.max(
        beforeTo.lastIndexOf("は"),
        beforeTo.lastIndexOf("が"),
        beforeTo.lastIndexOf("を"),
        beforeTo.lastIndexOf("に"),
        beforeTo.lastIndexOf("で"),
        beforeTo.lastIndexOf("へ"),
        beforeTo.lastIndexOf("も"),
        beforeTo.lastIndexOf("の")
    );
    const prefix = particleIndex >= 0 ? beforeTo.slice(0, particleIndex + 1) : "";
    const firstItem = beforeTo.slice(prefix.length);
    const suffixCandidates = ["ではありません", "でした", "ません", "ました", "です", "ます", "だ"];
    const suffix = suffixCandidates.find((candidate) => afterTo.endsWith(candidate)) || "";
    const secondItem = suffix ? afterTo.slice(0, -suffix.length) : afterTo;

    if (!firstItem || !secondItem) {
        return "";
    }

    const pair = [firstItem, secondItem].sort((left, right) => left.localeCompare(right, "ja"));
    return `${prefix}${pair[0]}と${pair[1]}${suffix}`;
}

export function isSameArrangeAnswer(left, right) {
    if (normalizeArrangeText(left) === normalizeArrangeText(right)) {
        return true;
    }

    const leftToList = canonicalizeSingleToListText(left);
    const rightToList = canonicalizeSingleToListText(right);

    if (leftToList && rightToList && leftToList === rightToList) {
        return true;
    }

    const leftTokens = tokenizeArrangeAnswer(left);
    const rightTokens = tokenizeArrangeAnswer(right);

    if (leftTokens.length !== rightTokens.length || leftTokens.length < 3) {
        return false;
    }

    return canonicalizeToListTokens(leftTokens).join("|") === canonicalizeToListTokens(rightTokens).join("|");
}

const WINDOWS_1252_BYTE_BY_CHAR = {
    "€": 0x80,
    "‚": 0x82,
    "ƒ": 0x83,
    "„": 0x84,
    "…": 0x85,
    "†": 0x86,
    "‡": 0x87,
    "ˆ": 0x88,
    "‰": 0x89,
    "Š": 0x8a,
    "‹": 0x8b,
    "Œ": 0x8c,
    "Ž": 0x8e,
    "‘": 0x91,
    "’": 0x92,
    "“": 0x93,
    "”": 0x94,
    "•": 0x95,
    "–": 0x96,
    "—": 0x97,
    "˜": 0x98,
    "™": 0x99,
    "š": 0x9a,
    "›": 0x9b,
    "œ": 0x9c,
    "ž": 0x9e,
    "Ÿ": 0x9f,
};

function getSingleByteCode(char) {
    const code = char.charCodeAt(0);
    if (code <= 255) {
        return code;
    }

    return WINDOWS_1252_BYTE_BY_CHAR[char];
}

function decodeLatin1MojibakeSegment(segment) {
    if (!/[ÃÂÄÆâáºá»‘’“”]/.test(segment)) {
        return segment;
    }

    try {
        const bytes = Uint8Array.from(Array.from(segment).map(getSingleByteCode));
        if (typeof TextDecoder !== "undefined") {
            return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        }
    } catch {
        return segment;
    }

    return segment;
}

export function repairMojibakeText(value) {
    const text = String(value || "");

    if (!/[ÃÂÄÆâáºá»‘’“”]/.test(text)) {
        return text;
    }

    let output = "";
    let latinSegment = "";

    Array.from(text).forEach((char) => {
        if (getSingleByteCode(char) !== undefined) {
            latinSegment += char;
            return;
        }

        output += decodeLatin1MojibakeSegment(latinSegment);
        latinSegment = "";
        output += char;
    });

    return output + decodeLatin1MojibakeSegment(latinSegment);
}

export function parseInlineRubyText(value = "") {
    const text = repairMojibakeText(value);
    const segments = [];
    const rubyPattern = /(["'“”‘’「『])?([一-龯々〆ヶーァ-ヶぁ-ゖ゠-ヿA-Za-z0-9]+)(["'“”‘’」』])?\s*[（(]([^()（）]+)[）)]/g;

    let lastIndex = 0;
    let match;

    while ((match = rubyPattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ text: text.slice(lastIndex, match.index), reading: "" });
        }

        segments.push({ text: match[2], reading: match[4], prefix: match[1] || "", suffix: match[3] || "" });
        lastIndex = rubyPattern.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({ text: text.slice(lastIndex), reading: "" });
    }

    return segments;
}

export function stripInlineRubyText(value = "") {
    return parseInlineRubyText(value).map((segment) => segment.text).join("");
}

export function readingFromInlineRubyText(value = "") {
    return parseInlineRubyText(value)
        .map((segment) => segment.reading || segment.text)
        .join("");
}

export function hasInlineRubyText(value = "") {
    return parseInlineRubyText(value).some((segment) => Boolean(segment.reading));
}

export function tokenizeFormula(formula = "") {
    return stripInlineRubyText(formula)
        .replace(/([+/()])/g, " $1 ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);
}

export function isMeaningfulToken(token) {
    return !["+", "/", "(", ")", "・", "、", ","].includes(token);
}

export function shuffle(array) {
    const copied = [...array];
    for (let i = copied.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copied[i], copied[j]] = [copied[j], copied[i]];
    }
    return copied;
}

export function repeatToCount(items, count) {
    if (!items.length) {
        return [];
    }
    const next = [];
    for (let i = 0; i < count; i += 1) {
        next.push(items[i % items.length]);
    }
    return next;
}

export function buildArrangeQuestion(item, index) {
    const sourceText = String(item.structure || item.formula || "");
    const tokens = tokenizeFormula(sourceText).filter(Boolean);
    const pieces = shuffle(
        tokens.map((text, pieceIndex) => ({
            id: `${item.id}-arrange-${index}-${pieceIndex}`,
            text,
        }))
    );

    return {
        id: `${item.id}-arrange-${index}`,
        type: "arrange",
        sourceTitle: item.title,
        sourceMeaning: item.meaning,
        prompt: "Sắp xếp lại các phần sau để tạo đúng công thức ngữ pháp.",
        sourceText,
        reading: sourceText,
        pieces,
        correctAnswer: tokens.join(" "),
        reference: sourceText,
        explanation: item.usage || item.notes || item.meaning,
    };
}

export function buildFillQuestion(item, index, tokenPool) {
    const sourceText = String(item.structure || item.formula || "");
    const tokens = tokenizeFormula(sourceText).filter(Boolean);
    const candidateIndexes = tokens
        .map((token, tokenIndex) => (isMeaningfulToken(token) ? tokenIndex : -1))
        .filter((tokenIndex) => tokenIndex >= 0);
    const blankIndex = candidateIndexes.length > 0 ? candidateIndexes[Math.min(1, candidateIndexes.length - 1)] : 0;
    const correctAnswer = tokens[blankIndex] || tokens[0] || "";
    const formulaWithBlank = tokens.map((token, tokenIndex) => (tokenIndex === blankIndex ? "____" : token)).join(" ");
    const distractors = shuffle(Array.from(new Set(tokenPool.filter((token) => token !== correctAnswer)))).slice(0, 3);
    const options = shuffle(Array.from(new Set([correctAnswer, ...distractors])));

    return {
        id: `${item.id}-fill-${index}`,
        type: "fill",
        sourceTitle: item.title,
        sourceMeaning: item.meaning,
        prompt: "Điền từ hoặc mẫu ngữ pháp còn thiếu vào chỗ trống.",
        sourceText,
        reading: sourceText,
        formulaWithBlank,
        options,
        correctAnswer,
        reference: sourceText,
        explanation: item.usage || item.notes || item.meaning,
    };
}

export function buildQuestionsForSingleLesson(lesson, count = 10) {
    if (!lesson || !(lesson.structure || lesson.formula)) {
        return [];
    }

    const items = repeatToCount([lesson], Math.floor(count / 2));
    const tokenPool = Array.from(
        new Set(
            items
                .flatMap((item) => tokenizeFormula(item.structure || item.formula).filter(isMeaningfulToken))
                .filter(Boolean)
        )
    );

    const arrangeQuestions = items.map((item, index) => buildArrangeQuestion(item, index));
    const fillQuestions = items.map((item, index) => buildFillQuestion(item, index, tokenPool));

    return shuffle([...arrangeQuestions, ...fillQuestions]);
}

export function buildQuestionsForMultipleLessons(pool, totalCount = 10, arrangeCount = 5) {
    const items = pool.filter(Boolean);

    if (!items.length) {
        return [];
    }

    const expanded = repeatToCount(items, totalCount);
    const tokenPool = Array.from(
        new Set(items.flatMap((item) => tokenizeFormula(item.structure || item.formula).filter(isMeaningfulToken)))
    );

    const arrangeItems = expanded.slice(0, arrangeCount);
    const fillItems = expanded.slice(arrangeCount, totalCount);

    return [
        ...arrangeItems.map((item, index) => buildArrangeQuestion(item, index)),
        ...fillItems.map((item, index) => buildFillQuestion(item, index, tokenPool)),
    ];
}

export function getArrangeAnswerText(question, answerIds = []) {
    const pieceMap = new Map(question.pieces.map((piece) => [piece.id, piece.text]));
    return answerIds.map((pieceId) => pieceMap.get(pieceId)).filter(Boolean).join(" ").trim();
}

export function calculateScore(questions, answers) {
    const total = questions.length;
    const correct = questions.reduce((acc, question, index) => {
        let userAnswer = "";

        if (question.type === "arrange") {
            userAnswer = getArrangeAnswerText(question, Array.isArray(answers[index]) ? answers[index] : []);
        } else {
            userAnswer = normalizeText(answers[index]);
        }

        const isCorrect = question.type === "arrange"
            ? isSameArrangeAnswer(userAnswer, question.correctAnswer)
            : normalizeText(userAnswer) === normalizeText(question.correctAnswer);
        return acc + (isCorrect ? 1 : 0);
    }, 0);

    const percentage = total ? Math.round((correct / total) * 100) : 0;
    return { total, correct, percentage };
}

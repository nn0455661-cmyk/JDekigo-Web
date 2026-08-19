"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ListOrdered, Plus, Trash2 } from "lucide-react";
import notify from "@/src/lib/notifier";
import { getTest, listAdminLessons, createTest, updateTest } from "@/src/services/admin.service";
import { readingFromInlineRubyText } from "@/utils/grammarQuestionBuilder";

const TEST_MODULES = [
    { value: "vocabulary", label: "Từ vựng" },
    { value: "kanji", label: "Kanji" },
    { value: "grammar", label: "Ngữ pháp" },
    { value: "reading", label: "Luyện đọc" },
    { value: "mock_test", label: "Kiểm tra" },
];
const TEST_KINDS = [
    { value: "lesson_test", label: "Bài tập" },
    { value: "mini_practice", label: "Bài kiểm tra" },
    { value: "module_exam", label: "Kiểm tra" },
];

const TEST_RULES = {
    lesson_test: {
        scopeLabel: "Chọn bài học",
        scopeHint: "Danh sách bài học được lấy theo module đã chọn.",
        requiresLesson: true,
        minQuestions: 15,
        maxQuestions: 20,
        defaultQuestions: 15,
    },
    mini_practice: {
        scopeLabel: "Theo bài học",
        scopeHint: "Bài kiểm tra phải gắn với một bài học trong module đã chọn.",
        requiresLesson: true,
        minQuestions: 15,
        maxQuestions: 30,
        defaultQuestions: 15,
    },
    module_exam: {
        scopeLabel: "Theo level",
        scopeHint: "Kiểm tra được khóa theo level, module tự chuyển sang Kiểm tra.",
        requiresLesson: false,
        minQuestions: 30,
        maxQuestions: 50,
        defaultQuestions: 30,
    },
};

const TEST_KIND_LABEL = TEST_KINDS.reduce((accumulator, kindItem) => {
    accumulator[kindItem.value] = kindItem.label;
    return accumulator;
}, {});

function splitTextList(value) {
    return String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildGrammarPieces(wordsText) {
    return splitTextList(wordsText).map((text, index) => ({
        id: `piece-${index + 1}`,
        text,
    }));
}

const ANSWER_LABELS = ["A", "B", "C", "D"];

function getAnswerLabel(index) {
    return ANSWER_LABELS[index] || String.fromCharCode(65 + index);
}

function getCorrectAnswerSelection(questionItem) {
    const rawAnswer = String(questionItem?.correctAnswer || "").trim();
    if (!rawAnswer) {
        return "";
    }

    const directLabel = rawAnswer.length === 1 ? rawAnswer.toUpperCase() : "";
    if (ANSWER_LABELS.includes(directLabel)) {
        return directLabel;
    }

    const matchedIndex = Array.isArray(questionItem?.choices)
        ? questionItem.choices.findIndex((choiceItem) => String(choiceItem || "").trim() === rawAnswer)
        : -1;

    return matchedIndex >= 0 ? getAnswerLabel(matchedIndex) : "";
}

function getQuestionHint(testKind) {
    if (testKind === "lesson_test") {
        return "Bài tập theo bài học, không giới hạn thời gian.";
    }

    if (testKind === "mini_practice") {
        return "Bài kiểm tra theo mô-đun gồm 15 đến 30 câu hỏi, không giới hạn thời gian.";
    }

    return "Kiểm tra theo level gồm 30 đến 50 câu hỏi, không giới hạn thời gian.";
}

function buildQuestionState(count, grammarMode = false) {
    return Array.from({ length: count }, (_, index) => ({
        id: `q-${index + 1}`,
        title: `Câu ${index + 1}`,
        questionType: grammarMode ? (index % 2 === 0 ? "arrange" : "fill") : "multiple_choice",
        content: "",
        prompt: "",
        passage: "",
        correctSentence: "",
        wordsText: "",
        question: "",
        choices: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        subQuestions: [
            {
                id: `q-${index + 1}-sub-1`,
                content: "",
                choices: ["", "", "", ""],
                correctAnswer: "",
                explanation: "",
            },
        ],
    }));
}

function reorderQuestionTitles(questions) {
    return questions.map((questionItem, index) => ({
        ...questionItem,
        title: `Câu ${index + 1}`,
    }));
}

function buildDefaultDraft({ isEditing, testId, initialModule, initialLessonId, initialKind, initialGroupId }) {
    const testKind = initialKind || "module_exam";

    if (testKind === "lesson_test") {
        return {
            testTitle: isEditing ? `Nháp ${testId}` : "",
            module: "grammar",
            testKind,
            lessonId: initialLessonId || "1",
            timeLimit: 0,
            totalQuestions: 15,
            status: "draft",
            questions: buildQuestionState(15, true),
        };
    }

    if (testKind === "mini_practice") {
        const moduleValue = initialModule === "mock_test" ? "vocabulary" : initialModule || "vocabulary";
        return {
            testTitle: isEditing ? `Nháp ${testId}` : "",
            module: moduleValue,
            testKind,
            lessonId: initialLessonId || "",
            timeLimit: 0,
            miniTestGroupId: "",
            totalQuestions: 15,
            status: "draft",
            questions: buildQuestionState(15, moduleValue === "grammar"),
        };
    }

    const isMiniGroupDraft = Boolean(initialGroupId);
    return {
        testTitle: isEditing ? `Nháp ${testId}` : "",
        module: "mock_test",
        testKind: "module_exam",
        lessonId: "",
        timeLimit: isMiniGroupDraft ? 15 : 35,
        miniTestGroupId: initialGroupId || "",
        totalQuestions: isMiniGroupDraft ? 15 : 30,
        status: "draft",
        questions: buildQuestionState(isMiniGroupDraft ? 15 : 30, false),
    };
}

function buildDraftStorageKey({ level, testId, initialModule, initialLessonId, initialKind, initialGroupId }) {
    return [
        "admin-test-draft",
        String(level || "JPD113").toUpperCase(),
        testId ? `edit:${testId}` : "create",
        initialKind || "module_exam",
        initialModule || "vocabulary",
        initialLessonId || "",
        initialGroupId || "",
    ].join(":");
}

function readDraft(storageKey) {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

function mapServerQuestionToDraft(questionItem, index) {
    const questionType = questionItem.type === "arrange" || questionItem.type === "arrangement"
        ? "arrange"
        : questionItem.type === "reading_comprehension"
            ? "reading_comprehension"
            : questionItem.type === "fill" || questionItem.type === "multiple_choice"
                ? "fill"
                : "multiple_choice";

    return {
        id: questionItem.id || `q-${index + 1}`,
        title: `Câu ${index + 1}`,
        questionType,
        content: questionItem.question || "",
        prompt: questionItem.prompt || "",
        passage: questionItem.passage || "",
        correctSentence: questionItem.correctSentence || questionItem.correctAnswer || "",
        wordsText: Array.isArray(questionItem.pieces)
            ? questionItem.pieces.map((piece) => piece?.text || "").filter(Boolean).join(", ")
            : "",
        question: questionItem.formulaWithBlank || questionItem.question || "",
        choices: Array.isArray(questionItem.options) ? questionItem.options : ["", "", "", ""],
        correctAnswer: questionItem.correctAnswer || "",
        explanation: questionItem.explanation || "",
    };
}

function groupServerQuestionsToDraft(serverQuestions) {
    const grouped = [];
    let currentGroup = null;

    serverQuestions.forEach((q, index) => {
        const draftQ = mapServerQuestionToDraft(q, index);

        if (draftQ.questionType === "reading_comprehension") {
            if (currentGroup && currentGroup.passage === draftQ.passage) {
                currentGroup.subQuestions.push({
                    id: draftQ.id,
                    content: draftQ.content,
                    choices: draftQ.choices,
                    correctAnswer: draftQ.correctAnswer,
                    explanation: draftQ.explanation,
                });
            } else {
                draftQ.subQuestions = [{
                    id: draftQ.id,
                    content: draftQ.content,
                    choices: draftQ.choices,
                    correctAnswer: draftQ.correctAnswer,
                    explanation: draftQ.explanation,
                }];
                currentGroup = draftQ;
                grouped.push(currentGroup);
            }
        } else {
            currentGroup = null;
            draftQ.subQuestions = [{
                id: `${draftQ.id}-sub-1`,
                content: "",
                choices: ["", "", "", ""],
                correctAnswer: "",
                explanation: "",
            }];
            grouped.push(draftQ);
        }
    });

    return reorderQuestionTitles(grouped);
}

function buildDraftFromServerItem(item, fallback) {
    const testKind = item.testKind || fallback.testKind;
    const moduleValue = testKind === "lesson_test"
        ? "grammar"
        : testKind === "module_exam"
            ? "mock_test"
            : item.module || fallback.module;
    let lessonId = item.lessonId || fallback.lessonId || "";
    if (testKind === "module_exam") {
        lessonId = "";
    }
    const totalQuestions = Number(item.totalQuestions || item.questions?.length || fallback.totalQuestions || 15);
    
    const serverQuestions = Array.isArray(item.questions) ? item.questions : [];
    const questions = serverQuestions.length > 0
        ? groupServerQuestionsToDraft(serverQuestions)
        : buildQuestionState(totalQuestions, moduleValue === "grammar" && (testKind === "lesson_test" || testKind === "mini_practice"));

    return {
        testTitle: item.testTitle || fallback.testTitle || "",
        module: moduleValue,
        testKind,
        lessonId,
        timeLimit: Number(item.timeLimit) || fallback.timeLimit || 0,
        miniTestGroupId: item.miniTestGroupId || fallback.miniTestGroupId || "",
        totalQuestions,
        status: item.status || fallback.status || "draft",
        questions,
    };
}

function normalizePersistedDraft(rawDraft, fallback) {
    const draft = rawDraft && typeof rawDraft === "object" ? rawDraft : {};
    const testKind = typeof draft.testKind === "string" && TEST_RULES[draft.testKind]
        ? draft.testKind
        : fallback.testKind;

    let moduleValue = typeof draft.module === "string" && draft.module.trim()
        ? draft.module
        : fallback.module;

    if (testKind === "lesson_test") {
        moduleValue = "grammar";
    } else if (testKind === "module_exam") {
        moduleValue = "mock_test";
    } else if (moduleValue === "mock_test") {
        moduleValue = fallback.module === "mock_test" ? "vocabulary" : fallback.module;
    }

    const lessonId = testKind === "lesson_test" || testKind === "mini_practice"
        ? String(draft.lessonId || fallback.lessonId || "1")
        : "";
    const totalQuestions = Number.isFinite(Number(draft.totalQuestions))
        ? Number(draft.totalQuestions)
        : fallback.totalQuestions;
    const grammarMode = moduleValue === "grammar" && (testKind === "lesson_test" || testKind === "mini_practice");
    const questions = Array.isArray(draft.questions) && draft.questions.length
        ? draft.questions.map((questionItem, index) => ({
            ...buildQuestionState(1, grammarMode)[0],
            ...questionItem,
            id: questionItem?.id || `q-${index + 1}`,
            title: questionItem?.title || `Câu ${index + 1}`,
            questionType: questionItem?.questionType || (grammarMode ? (index % 2 === 0 ? "arrange" : "fill") : "multiple_choice"),
            passage: questionItem?.passage || "",
            subQuestions: Array.isArray(questionItem?.subQuestions) && questionItem.subQuestions.length > 0
                ? questionItem.subQuestions.map((subQuestion, subIndex) => ({
                    ...subQuestion,
                    id: subQuestion?.id || `q-${index + 1}-sub-${subIndex + 1}`,
                    content: subQuestion?.content || "",
                    choices: Array.isArray(subQuestion?.choices) ? subQuestion.choices : ["", "", "", ""],
                    correctAnswer: subQuestion?.correctAnswer || "",
                    explanation: subQuestion?.explanation || "",
                }))
                : [
                    {
                        id: `q-${index + 1}-sub-1`,
                        content: questionItem?.content || "",
                        choices: Array.isArray(questionItem?.choices) ? questionItem.choices : ["", "", "", ""],
                        correctAnswer: questionItem?.correctAnswer || "",
                        explanation: questionItem?.explanation || "",
                    }
                ],
            choices: Array.isArray(questionItem?.choices) ? questionItem.choices : ["", "", "", ""],
        }))
        : buildQuestionState(totalQuestions, grammarMode);

    return {
        testTitle: typeof draft.testTitle === "string" ? draft.testTitle : fallback.testTitle || "",
        module: moduleValue,
        testKind,
        lessonId,
        timeLimit: Number(draft.timeLimit ?? fallback.timeLimit) || 0,
        miniTestGroupId: String(draft.miniTestGroupId || fallback.miniTestGroupId || ""),
        totalQuestions,
        status: draft.status === "published" ? "published" : "draft",
        questions,
    };
}

export default function AdminTestCreatePage({ level, testId, searchParams = {} }) {
    const normalizedLevel = (level || "JPD113").toLowerCase();
    const displayLevel = normalizedLevel.toUpperCase();
    const isEditing = Boolean(testId);
    const initialModule = searchParams?.module || "vocabulary";
    const initialLessonId = searchParams?.lessonId || "1";
    const initialKind = searchParams?.kind || "module_exam";
    const initialGroupId = searchParams?.groupId || "";
    const hasLessonContext = Boolean(searchParams?.module && searchParams?.lessonId);
    const backTo = typeof searchParams?.backTo === "string" && searchParams.backTo.trim() ? searchParams.backTo.trim() : "";
    const router = useRouter();

    const [testTitle, setTestTitle] = useState(isEditing ? `Nháp ${testId}` : "");
    const [module, setModule] = useState(hasLessonContext ? initialModule : initialModule);
    const [testKind, setTestKind] = useState(initialKind);
    const [lessonId, setLessonId] = useState(hasLessonContext ? initialLessonId : "1");
    const [timeLimit, setTimeLimit] = useState(0);
    const [miniTestGroupId, setMiniTestGroupId] = useState(initialGroupId);
    const [totalQuestions, setTotalQuestions] = useState(15);
    const [status, setStatus] = useState("draft");
    const [questions, setQuestions] = useState([]);
    const [lessonOptions, setLessonOptions] = useState([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingTest, setLoadingTest] = useState(isEditing);
    const [draftReady, setDraftReady] = useState(false);
    const isGrammarQuestionSet = module === "grammar" && (testKind === "lesson_test" || testKind === "mini_practice");
    const draftStorageKey = useMemo(
        () => buildDraftStorageKey({ level: normalizedLevel, testId, initialModule, initialLessonId, initialKind, initialGroupId }),
        [initialGroupId, initialKind, initialLessonId, initialModule, normalizedLevel, testId]
    );
    const draftRestoredRef = useRef(false);

    const moduleRef = useRef(null);
    const lessonRef = useRef(null);
    const levelRef = useRef(null);
    const questionRef = useRef(null);

    const rule = TEST_RULES[testKind];
    const isLessonTest = testKind === "lesson_test";
    const isGrammarExercise = isGrammarQuestionSet;
    const isMockMiniTest = testKind === "module_exam" && Boolean(miniTestGroupId || initialGroupId);
    const isModuleTest = testKind === "mini_practice";
    const isLevelExam = testKind === "module_exam" && !isMockMiniTest;
    const isMockModule = module === "mock_test";
    const needsLessonOptions = isLessonTest || isModuleTest;
    const allowMockModule = isLevelExam || isMockMiniTest;
    const lockKindToModule = !isEditing && (isMockMiniTest || isMockModule || Boolean(initialModule && initialModule !== "mock_test"));
    const formKindLabel = isMockMiniTest ? "Đề kiểm tra nhỏ" : TEST_KIND_LABEL[testKind] || "Bài kiểm tra";
    const scopeLabel = isMockMiniTest ? "Theo nhóm kiểm tra nhỏ" : rule.scopeLabel;
    const scopeHint = isMockMiniTest ? "Đề kiểm tra nhỏ thuộc nhóm kiểm tra nhỏ đang mở." : rule.scopeHint;
    const titlePlaceholder = isMockMiniTest ? "Ví dụ: Kiểm tra nhỏ 1 - Đề 1" : "Ví dụ: Kiểm tra Từ vựng bài 1";
    const questionMin = isMockMiniTest ? 15 : rule.minQuestions;
    const questionMax = isMockMiniTest ? 30 : rule.maxQuestions;
    const questionHint = useMemo(
        () => isMockMiniTest
            ? "Đề kiểm tra nhỏ gồm 15 đến 30 câu hỏi và có thời gian làm bài riêng."
            : getQuestionHint(testKind),
        [isMockMiniTest, testKind]
    );
    const getKindOptionLabel = (kindItem) => {
        if (isMockMiniTest && kindItem.value === "module_exam") {
            return "Đề kiểm tra nhỏ";
        }

        if (!isMockMiniTest && kindItem.value === "mini_practice") {
            return "Bài kiểm tra theo mô-đun";
        }

        return kindItem.label;
    };
    const availableTestKinds = useMemo(
        () => {
            if (isEditing && testKind === "lesson_test") {
                return TEST_KINDS;
            }

            if (isMockMiniTest) {
                return TEST_KINDS.filter((kindItem) => kindItem.value === "module_exam");
            }

            if (isMockModule) {
                return TEST_KINDS.filter((kindItem) => kindItem.value === "module_exam");
            }

            return TEST_KINDS.filter((kindItem) => kindItem.value === "mini_practice");
        },
        [isEditing, isMockMiniTest, isMockModule, testKind]
    );
    const grammarQuestionTypeLabel = (type) => (type === "arrange" ? "Sắp xếp câu" : "Trắc nghiệm điền chỗ trống");
    const fallbackBackHref = isLevelExam
        ? `/admin/tests/${normalizedLevel}`
        : `/admin/${module}/${normalizedLevel}`;
    const resolvedBackHref = backTo || fallbackBackHref;

    useEffect(() => {
        if (!needsLessonOptions || !draftReady) {
            setLessonOptions([]);
            return;
        }
        let isMounted = true;

        const loadLessons = async () => {
            setLoadingLessons(true);

            try {
                const data = await listAdminLessons({ module: module || "grammar", level: displayLevel });

                if (isMounted) {
                    setLessonOptions(data.items || []);
                }
            } catch (error) {
                if (isMounted) {
                    notify.error(error, "Không tải được danh sách bài học");
                }
            } finally {
                if (isMounted) {
                    setLoadingLessons(false);
                }
            }
        };

        loadLessons();

        return () => {
            isMounted = false;
        };
    }, [displayLevel, draftReady, module, needsLessonOptions]);

    useEffect(() => {
        let isMounted = true;
        const fallbackDraft = buildDefaultDraft({
            isEditing,
            testId,
            initialModule,
            initialLessonId,
            initialKind,
            initialGroupId,
        });

        const loadDraft = async () => {
            try {
                const savedDraft = readDraft(draftStorageKey);

                // If editing an existing test, always prefer server data to ensure correctness.
                if (isEditing) {
                    const data = await getTest(testId);
                    const item = data.item;

                    if (!isMounted || !item) {
                        return;
                    }

                    const nextDraft = buildDraftFromServerItem(item, fallbackDraft);

                    setTestTitle(nextDraft.testTitle || "");
                    setModule(nextDraft.module || fallbackDraft.module);
                    setTestKind(nextDraft.testKind || fallbackDraft.testKind);
                    setLessonId(nextDraft.lessonId || "");
                    setTimeLimit(nextDraft.timeLimit || 0);
                    setMiniTestGroupId(nextDraft.miniTestGroupId || initialGroupId);
                    setTotalQuestions(nextDraft.totalQuestions || fallbackDraft.totalQuestions);
                    setStatus(nextDraft.status || "draft");
                    setQuestions(nextDraft.questions || fallbackDraft.questions);
                    // still allow draftReady flag and allow drafts to be persisted later
                    setLoadingTest(false);
                    setDraftReady(true);
                    return;
                }

                // For create mode, prefer a saved local draft if available.
                if (savedDraft) {
                    draftRestoredRef.current = true;
                    const nextDraft = normalizePersistedDraft(savedDraft, fallbackDraft);

                    if (!isMounted) {
                        return;
                    }

                    setTestTitle(nextDraft.testTitle || "");
                    setModule(nextDraft.module || fallbackDraft.module);
                    setTestKind(nextDraft.testKind || fallbackDraft.testKind);
                    setLessonId(nextDraft.lessonId || "");
                    setTimeLimit(nextDraft.timeLimit || 0);
                    setMiniTestGroupId(nextDraft.miniTestGroupId || initialGroupId);
                    setTotalQuestions(nextDraft.totalQuestions || fallbackDraft.totalQuestions);
                    setStatus(nextDraft.status || "draft");
                    setQuestions(nextDraft.questions || fallbackDraft.questions);
                    setLoadingTest(false);
                    setDraftReady(true);
                    return;
                }

                // No saved draft and not editing -> use fallback defaults
                setTestTitle(fallbackDraft.testTitle || "");
                setModule(fallbackDraft.module || initialModule);
                setTestKind(fallbackDraft.testKind || initialKind);
                setLessonId(fallbackDraft.lessonId || "");
                setTimeLimit(fallbackDraft.timeLimit || 0);
                setMiniTestGroupId(fallbackDraft.miniTestGroupId || initialGroupId);
                setTotalQuestions(fallbackDraft.totalQuestions || 15);
                setStatus(fallbackDraft.status || "draft");
                setQuestions(fallbackDraft.questions || buildQuestionState(15, false));
            } catch (error) {
                if (isMounted) {
                    notify.error(error, isEditing ? "Không tải được dữ liệu bài kiểm tra" : "Không khởi tạo được nháp bài kiểm tra");
                }
            } finally {
                if (isMounted) {
                    setLoadingTest(false);
                    setDraftReady(true);
                }
            }
        };

        loadDraft();

        return () => {
            isMounted = false;
        };
    }, [draftStorageKey, initialGroupId, initialKind, initialLessonId, initialModule, isEditing, testId]);

    useEffect(() => {
        if (!draftReady) {
            return;
        }

        if (isLessonTest) {
            setModule("grammar");
        }

        if (isMockMiniTest) {
            setModule("mock_test");
            setLessonId("");
            setTimeLimit((current) => Math.max(current || 15, 1));
            setTotalQuestions((current) => Math.min(Math.max(current || 15, 15), 30));
        } else if (testKind === "module_exam") {
            setModule("mock_test");
            setLessonId("");
            setTimeLimit((current) => current || 35);
            setTotalQuestions((current) => Math.min(Math.max(current || 30, 30), 50));
        } else if (testKind === "mini_practice") {
            setTimeLimit(0);
            setTotalQuestions((current) => Math.min(Math.max(current || 15, 15), 30));
            if (module === "mock_test") {
                setModule("vocabulary");
            }
        } else {
            setTimeLimit(0);
            setTotalQuestions((current) => Math.min(Math.max(current || 15, 15), 20));
            if (module === "mock_test") {
                setModule(initialModule !== "mock_test" ? initialModule : "vocabulary");
            }
        }

        window.requestAnimationFrame(() => {
            if (testKind === "mini_practice") {
                moduleRef.current?.focus();
                return;
            }

            if (testKind === "lesson_test") {
                lessonRef.current?.focus();
                return;
            }

            moduleRef.current?.focus();
        });
    }, [draftReady, initialModule, isEditing, isLessonTest, isMockMiniTest, module, testKind]);

    useEffect(() => {
        if (!draftReady) {
            return;
        }

        if (totalQuestions === "") {
            return;
        }

        setQuestions((currentQuestions) => {
            const nextQuestions = buildQuestionState(totalQuestions, isGrammarQuestionSet);

            return nextQuestions.map((questionItem, index) => ({
                ...questionItem,
                ...currentQuestions[index],
                id: questionItem.id,
                title: currentQuestions[index]?.title || questionItem.title,
            }));
        });
    }, [draftReady, isGrammarQuestionSet, totalQuestions]);

    useEffect(() => {
        if (!draftReady) {
            return;
        }

        if (!needsLessonOptions) {
            return;
        }

        if (loadingLessons || !lessonOptions.length) {
            return;
        }

        const currentLessonExists = lessonOptions.some((item) => item.id === lessonId || String(item.lessonOrder) === String(lessonId));

        if (!currentLessonExists) {
            setLessonId(lessonOptions[0].id);
        }
    }, [draftReady, lessonId, lessonOptions, loadingLessons, module, needsLessonOptions]);

    useEffect(() => {
        if (!draftReady) {
            return;
        }

        if (!isEditing && isMockMiniTest) {
            setTestKind("module_exam");
            setModule("mock_test");
            setLessonId("");
            setTimeLimit((current) => Math.max(current || 15, 1));
            if (Number(totalQuestions) < 15 || Number(totalQuestions) > 30) {
                setTotalQuestions(15);
                setQuestions(buildQuestionState(15, false));
            }
            return;
        }

        if (!isEditing && module === "mock_test" && testKind !== "module_exam") {
            setTestKind("module_exam");
            setLessonId("");
            setTimeLimit(0);
            setTotalQuestions(30);
            setQuestions(buildQuestionState(30, false));
            return;
        }

        if (!isEditing && module !== "mock_test" && !isMockMiniTest && testKind !== "mini_practice") {
            setTestKind("mini_practice");
            setTimeLimit(0);
            setTotalQuestions(15);
            setQuestions(buildQuestionState(15, module === "grammar"));
            return;
        }

        if (isLevelExam) {
            setModule("mock_test");
            setLessonId("");
        }

        if (isMockMiniTest) {
            setModule("mock_test");
            setLessonId("");
        }

        if (isModuleTest && module === "mock_test") {
            setModule("vocabulary");
        }
    }, [draftReady, isEditing, isLevelExam, isMockMiniTest, isModuleTest, module, testKind, totalQuestions]);

    useEffect(() => {
        if (!draftReady || typeof window === "undefined") {
            return;
        }

        const payload = {
            testTitle,
            module,
            testKind,
            lessonId,
            timeLimit,
            miniTestGroupId,
            totalQuestions,
            status,
            questions,
        };

        try {
            window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        } catch {
            // Ignore localStorage failures so the form remains usable.
        }
    }, [draftReady, draftStorageKey, lessonId, miniTestGroupId, module, questions, status, testKind, testTitle, timeLimit, totalQuestions]);

    const handleKindChange = (nextKind) => {
        setTestKind(nextKind);

        if (nextKind === "lesson_test") {
            setModule("grammar");
            setLessonId((current) => current || initialLessonId || "");
            setTimeLimit(0);
            setTotalQuestions(15);
            setQuestions(buildQuestionState(15, true));
            return;
        }

        if (nextKind === "module_exam") {
            const isMiniGroup = Boolean(miniTestGroupId || initialGroupId);
            setModule("mock_test");
            setLessonId("");
            setTimeLimit(isMiniGroup ? Math.max(Number(timeLimit) || 15, 1) : 35);
            setTotalQuestions(isMiniGroup ? 15 : 30);
            setQuestions(buildQuestionState(isMiniGroup ? 15 : 30, false));
            return;
        }

        if (nextKind === "mini_practice") {
            const nextModule = module === "mock_test" ? initialModule === "mock_test" ? "vocabulary" : initialModule || "vocabulary" : module;
            setModule(nextModule);
            setMiniTestGroupId("");
            setLessonId((current) => current || initialLessonId || "");
            setTimeLimit(0);
            setTotalQuestions(15);
            setQuestions(buildQuestionState(15, nextModule === "grammar"));
            return;
        }

        setTimeLimit(0);
        setTotalQuestions(15);
        setQuestions(buildQuestionState(15, false));
    };

    const handleQuestionChange = (index, fieldName, fieldValue) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, questionIndex) =>
                questionIndex === index ? { ...questionItem, [fieldName]: fieldValue } : questionItem
            )
        );
    };

    const handleChoiceChange = (questionIndex, choiceIndex, choiceValue) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) => {
                if (currentIndex !== questionIndex) {
                    return questionItem;
                }

                const nextChoices = [...questionItem.choices];
                nextChoices[choiceIndex] = choiceValue;

                return { ...questionItem, choices: nextChoices };
            })
        );
    };

    const handleAddSubQuestion = (questionIndex) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) => {
                if (currentIndex !== questionIndex) return questionItem;
                const newSub = {
                    id: `q-${questionIndex + 1}-sub-${Date.now()}`,
                    content: "",
                    choices: ["", "", "", ""],
                    correctAnswer: "",
                    explanation: "",
                };
                return { ...questionItem, subQuestions: [...(questionItem.subQuestions || []), newSub] };
            })
        );
    };

    const handleRemoveSubQuestion = (questionIndex, subIndex) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) => {
                if (currentIndex !== questionIndex) return questionItem;
                if (!questionItem.subQuestions || questionItem.subQuestions.length <= 1) {
                    notify.error(null, "Bài đọc cần ít nhất 1 câu hỏi phụ");
                    return questionItem;
                }
                const nextSubs = questionItem.subQuestions.filter((_, idx) => idx !== subIndex);
                return { ...questionItem, subQuestions: nextSubs };
            })
        );
    };

    const handleSubQuestionChange = (questionIndex, subIndex, fieldName, fieldValue) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) => {
                if (currentIndex !== questionIndex) return questionItem;
                const nextSubs = [...(questionItem.subQuestions || [])];
                nextSubs[subIndex] = { ...nextSubs[subIndex], [fieldName]: fieldValue };
                return { ...questionItem, subQuestions: nextSubs };
            })
        );
    };

    const handleSubQuestionChoiceChange = (questionIndex, subIndex, choiceIndex, choiceValue) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) => {
                if (currentIndex !== questionIndex) return questionItem;
                const nextSubs = [...(questionItem.subQuestions || [])];
                const nextChoices = [...nextSubs[subIndex].choices];
                nextChoices[choiceIndex] = choiceValue;
                nextSubs[subIndex] = { ...nextSubs[subIndex], choices: nextChoices };
                return { ...questionItem, subQuestions: nextSubs };
            })
        );
    };

    const handleRemoveQuestion = (questionIndex) => {
        if (questions.length <= 1) {
            notify.error(null, "Bài kiểm tra cần ít nhất 1 câu hỏi");
            return;
        }

        if (typeof window !== "undefined" && !window.confirm(`Xóa câu ${questionIndex + 1}?`)) {
            return;
        }

        const nextQuestions = reorderQuestionTitles(
            questions.filter((_, currentIndex) => currentIndex !== questionIndex)
        );

        setQuestions(nextQuestions);
        setTotalQuestions(nextQuestions.length);
    };

    const handleQuestionTypeChange = (questionIndex, nextType) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) =>
                currentIndex === questionIndex ? { ...questionItem, questionType: nextType } : questionItem
            )
        );
    };

    const applyGrammarQuestionType = (questionIndex, nextType) => {
        setQuestions((currentQuestions) =>
            currentQuestions.map((questionItem, currentIndex) => {
                if (currentIndex !== questionIndex) {
                    return questionItem;
                }

                if (nextType === "arrange") {
                    return {
                        ...questionItem,
                        questionType: nextType,
                        choices: ["", "", "", ""],
                        correctAnswer: questionItem.correctSentence || questionItem.correctAnswer || "",
                    };
                }

                return {
                    ...questionItem,
                    questionType: nextType,
                    correctSentence: "",
                    wordsText: "",
                    prompt: "",
                    question: questionItem.question || questionItem.content || "",
                };
            })
        );
    };

    const handleCreateQuestions = async (event) => {
        event.preventDefault();

        if (!testTitle.trim()) {
            notify.error(null, "Vui lòng nhập tiêu đề bài kiểm tra");
            return;
        }

        const normalizedTotalQuestions = Number(totalQuestions) || 0;

        if (testKind === "mini_practice" && (normalizedTotalQuestions < 15 || normalizedTotalQuestions > 30)) {
            notify.error(null, "Bài kiểm tra theo mô-đun yêu cầu từ 15 đến 30 câu hỏi");
            return;
        }

        if (isMockMiniTest && (normalizedTotalQuestions < 15 || normalizedTotalQuestions > 30)) {
            notify.error(null, "Đề kiểm tra nhỏ yêu cầu từ 15 đến 30 câu hỏi");
            return;
        }

        if (isLevelExam && (normalizedTotalQuestions < 30 || normalizedTotalQuestions > 50)) {
            notify.error(null, "Kiểm tra theo level yêu cầu từ 30 đến 50 câu hỏi");
            return;
        }

        if (testKind === "module_exam" && module !== "mock_test") {
            notify.error(null, `${isMockMiniTest ? "Đề kiểm tra nhỏ" : "Kiểm tra theo level"} phải dùng mô-đun Kiểm tra`);
            return;
        }

        if (isMockMiniTest || testKind === "module_exam") {
            if (isMockMiniTest && !miniTestGroupId) {
                notify.error(null, "Đề kiểm tra nhỏ phải thuộc một nhóm kiểm tra nhỏ");
                return;
            }
            if (!Number.isInteger(Number(timeLimit)) || Number(timeLimit) < 1) {
                notify.error(null, "Vui lòng nhập thời gian làm bài");
                return;
            }
        }

        if (testKind === "lesson_test" && !lessonId.trim()) {
            notify.error(null, "Bài tập theo bài học cần chọn bài học cụ thể");
            return;
        }

        if (testKind === "mini_practice" && module !== "mock_test" && !lessonId.trim()) {
            notify.error(null, "Bài kiểm tra theo mô-đun cần chọn bài học cụ thể");
            lessonRef.current?.focus();
            return;
        }

        if (testKind === "lesson_test" && (totalQuestions < 15 || totalQuestions > 20)) {
            notify.error(null, "Bài tập theo bài học yêu cầu từ 15 đến 20 câu hỏi");
            return;
        }

        const missingQuestionIndex = questions.findIndex((questionItem) => {
            if (isGrammarQuestionSet) {
                if (questionItem.questionType === "arrange") {
                    const hasSentence = Boolean(questionItem.correctSentence.trim());
                    const hasWords = splitTextList(questionItem.wordsText).length >= 2;
                    return !hasSentence || !hasWords;
                }

                const hasPrompt = Boolean(questionItem.question.trim());
                const hasChoices = questionItem.choices.every((choiceItem) => Boolean(choiceItem.trim()));
                const hasCorrectAnswer = Boolean(getCorrectAnswerSelection(questionItem));
                return !hasPrompt || !hasChoices || !hasCorrectAnswer;
            }

            if (questionItem.questionType === "reading_comprehension") {
                const hasPassage = Boolean(questionItem.passage?.trim());
                if (!hasPassage) return true;
                
                return questionItem.subQuestions.some((subQ) => {
                    const hasContent = Boolean(subQ.content.trim());
                    const hasChoices = subQ.choices.every((choiceItem) => Boolean(choiceItem.trim()));
                    const hasCorrectAnswer = Boolean(subQ.correctAnswer.trim());
                    return !hasContent || !hasChoices || !hasCorrectAnswer;
                });
            }

            const hasContent = Boolean(questionItem.content.trim());
            const hasChoices = questionItem.choices.every((choiceItem) => Boolean(choiceItem.trim()));
            const hasCorrectAnswer = Boolean(questionItem.correctAnswer.trim());

            return !hasContent || !hasChoices || !hasCorrectAnswer;
        });

        if (missingQuestionIndex >= 0) {
            notify.error(null, `Vui lòng nhập nội dung và đáp án cho câu ${missingQuestionIndex + 1}`);
            return;
        }

        const payloadQuestions = [];
        questions.forEach((questionItem) => {
            if (isGrammarQuestionSet) {
                if (questionItem.questionType === "arrange") {
                    const correctSentence = questionItem.correctSentence.trim();
                    payloadQuestions.push({
                        type: "arrange",
                        question: questionItem.prompt.trim() || "Sắp xếp đúng ngữ pháp",
                        prompt: questionItem.prompt.trim() || "Sắp xếp đúng ngữ pháp",
                        reading: readingFromInlineRubyText(correctSentence),
                        correctSentence,
                        correctAnswer: correctSentence,
                        pieces: buildGrammarPieces(questionItem.wordsText),
                        options: [],
                        explanation: questionItem.explanation.trim(),
                    });
                } else {
                    const formulaWithBlank = questionItem.question.trim();
                    payloadQuestions.push({
                        type: "fill",
                        question: formulaWithBlank,
                        formulaWithBlank,
                        reading: readingFromInlineRubyText(formulaWithBlank),
                        options: questionItem.choices.map((choiceItem) => choiceItem.trim()),
                        correctAnswer: getCorrectAnswerSelection(questionItem),
                        explanation: questionItem.explanation.trim(),
                    });
                }
            } else if (questionItem.questionType === "reading_comprehension") {
                questionItem.subQuestions.forEach((subQ) => {
                    payloadQuestions.push({
                        type: "reading_comprehension",
                        question: subQ.content.trim(),
                        passage: questionItem.passage?.trim() || "",
                        options: subQ.choices.map((choiceItem) => choiceItem.trim()),
                        correctAnswer: subQ.correctAnswer.trim(),
                        explanation: subQ.explanation.trim(),
                    });
                });
            } else {
                payloadQuestions.push({
                    type: "multiple_choice",
                    question: questionItem.content.trim(),
                    passage: "",
                    options: questionItem.choices.map((choiceItem) => choiceItem.trim()),
                    correctAnswer: questionItem.correctAnswer.trim(),
                    explanation: questionItem.explanation.trim(),
                });
            }
        });

        const payload = {
            testTitle: testTitle.trim(),
            level: displayLevel,
            lessonId: testKind === "module_exam" || isMockMiniTest ? "" : lessonId,
            module,
            testKind,
            scopeType: isLessonTest || isModuleTest ? "lesson" : "level",
            miniTestGroupId: isMockMiniTest ? miniTestGroupId : "",
            timeLimit: isMockMiniTest || testKind === "module_exam" ? Number(timeLimit) : 0,
            status,
            questions: payloadQuestions,
        };

        setSaving(true);

        try {
            if (isEditing) {
                await updateTest(testId, payload);
                notify.success("Đã cập nhật bài kiểm tra");
            } else {
                await createTest(payload);
                notify.success("Đã tạo bài kiểm tra");
            }

            if (typeof window !== "undefined") {
                try {
                    window.localStorage.removeItem(draftStorageKey);
                } catch {
                    // Ignore localStorage failures after a successful save.
                }
            }

            if (!isEditing) {
                router.push(resolvedBackHref);
            }
        } catch (error) {
            notify.error(error, "Lưu bài kiểm tra thất bại");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="admin-page-stack">
            <div className="page-header admin-glass admin-subhero">
                <div className="admin-subhero-copy">
                    <p className="admin-kicker">Bài kiểm tra</p>
                    <h2>{isEditing ? "Chỉnh sửa" : "Tạo mới"} - {displayLevel}</h2>
                    <p className="small">Chọn loại bài, phạm vi và số câu hỏi.</p>
                    <div className="admin-subhero-pills">
                        <span className="chip">{formKindLabel}</span>
                        <span className="chip">{isMockMiniTest ? "Kiểm tra nhỏ" : "Kiểm tra"}</span>
                    </div>
                </div>
                <Link href={resolvedBackHref} className="admin-ghost-btn">
                    <ArrowLeft size={14} />
                    Quay lại
                </Link>
            </div>

            <div className="admin-test-editor">
                <div className="card admin-form-card admin-test-editor-card">
                    <form onSubmit={handleCreateQuestions} className="admin-form-grid admin-form-grid-tight">
                        <label className="span-2">
                            Tiêu đề {isMockMiniTest ? "đề kiểm tra nhỏ" : "bài kiểm tra"}
                            <input
                                value={testTitle}
                                onChange={(event) => setTestTitle(event.target.value)}
                                placeholder={titlePlaceholder}
                            />
                        </label>
                        <label>
                            Cấp độ
                            <input ref={levelRef} value={displayLevel} readOnly />
                        </label>
                        <label>
                            Trạng thái
                            <select value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="draft">Bản nháp</option>
                                <option value="published">Xuất bản</option>
                            </select>
                        </label>
                        <label>
                            Mô-đun
                            {isGrammarExercise ? (
                                <input ref={moduleRef} value="Ngữ pháp" readOnly />
                            ) : (
                                <select
                                    ref={moduleRef}
                                    value={module}
                                    onChange={(event) => setModule(event.target.value)}
                                    disabled={isLevelExam || isMockMiniTest}
                                >
                                    {TEST_MODULES.map((moduleItem) => (
                                        <option
                                            key={moduleItem.value}
                                            value={moduleItem.value}
                                            disabled={!allowMockModule && moduleItem.value === "mock_test"}
                                        >
                                            {moduleItem.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </label>
                        <label>
                            Loại bài kiểm tra
                            <select value={testKind} onChange={(event) => handleKindChange(event.target.value)} disabled={isMockMiniTest || lockKindToModule}>
                                {availableTestKinds.map((kindItem) => (
                                    <option key={kindItem.value} value={kindItem.value}>{getKindOptionLabel(kindItem)}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            {scopeLabel}
                            {isLessonTest ? (
                                <select
                                    ref={lessonRef}
                                    value={lessonId}
                                    onChange={(event) => setLessonId(event.target.value)}
                                >
                                    {loadingLessons ? (
                                        <option value="">Đang tải...</option>
                                    ) : lessonOptions.map((lessonItem) => (
                                        <option key={lessonItem.id} value={lessonItem.id}>
                                            {lessonItem.lessonTitle}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input value={scopeHint} readOnly />
                            )}
                        </label>
                        {isModuleTest ? (
                            <label>
                                Bài học
                                <select
                                    ref={lessonRef}
                                    value={lessonId}
                                    onChange={(event) => setLessonId(event.target.value)}
                                >
                                    {loadingLessons ? (
                                        <option value="">Đang tải...</option>
                                    ) : lessonOptions.map((lessonItem) => (
                                        <option key={lessonItem.id} value={lessonItem.id}>
                                            {lessonItem.lessonTitle}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                        <label>
                            Tổng số câu hỏi
                            <input
                                ref={questionRef}
                                type="number"
                                min={questionMin}
                                max={questionMax}
                                value={totalQuestions === "" ? "" : totalQuestions}
                                onChange={(event) => {
                                    const nextValue = event.target.value;
                                    setTotalQuestions(nextValue === "" ? "" : Number(nextValue));
                                }}
                            />
                        </label>
                        {isMockMiniTest || testKind === "module_exam" ? (
                            <label>
                                Thời gian làm bài (phút)
                                <input type="number" min="1" value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))} />
                            </label>
                        ) : null}

                        <p className="small span-2">{questionHint}</p>

                    </form>

                    <div className="admin-question-builder">
                        <div className="admin-question-builder-head">
                            <div>
                                <h3>Câu hỏi</h3>
                                <p className="small">{questions.length} câu theo số lượng đã chọn.</p>
                            </div>
                            <button type="button" className="btn" onClick={handleCreateQuestions} disabled={saving || loadingTest}>
                                <Plus size={14} />
                                {saving ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo câu hỏi"}
                            </button>
                        </div>

                        {isGrammarQuestionSet ? (
                            <div className="admin-grammar-guide">
                                <div className="admin-grammar-guide-card">
                                    <div className="admin-grammar-guide-title">
                                        <ListOrdered size={16} />
                                        <strong>Cách dùng nhanh</strong>
                                    </div>
                                    <p className="small">Chọn 1 trong 2 dạng, rồi điền đúng dữ liệu tương ứng. Có thể viết furigana inline theo dạng kanji（hiragana） ngay trong câu.</p>
                                </div>
                            </div>
                        ) : null}

                        <div className="admin-question-list">
                            {questions.map((questionItem, index) => (
                                <article key={questionItem.id} className="card admin-question-card">
                                    <div className="admin-question-card-head admin-test-question-card-head">
                                        <strong>{questionItem.title}</strong>
                                        <span className="chip">#{index + 1}</span>
                                        <button
                                            type="button"
                                            className="admin-icon-btn danger"
                                            onClick={() => handleRemoveQuestion(index)}
                                            aria-label={`Xóa câu ${index + 1}`}
                                            title="Xóa câu hỏi"
                                            disabled={saving || loadingTest}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {isGrammarQuestionSet ? (
                                        <div className="admin-grammar-question">
                                            <div className="admin-grammar-switcher" role="tablist" aria-label="Chọn dạng bài">
                                                <button
                                                    type="button"
                                                    className={`admin-grammar-switch ${questionItem.questionType === "arrange" ? "is-active" : ""}`}
                                                    onClick={() => applyGrammarQuestionType(index, "arrange")}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Sắp xếp câu
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`admin-grammar-switch ${questionItem.questionType === "fill" ? "is-active" : ""}`}
                                                    onClick={() => applyGrammarQuestionType(index, "fill")}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Điền chỗ trống
                                                </button>
                                            </div>

                                            <div className="admin-grammar-question-label small">
                                                Đang chọn: <strong>{grammarQuestionTypeLabel(questionItem.questionType)}</strong>
                                            </div>

                                            {questionItem.questionType === "arrange" ? (
                                                <div className="admin-grammar-fields">
                                                    <label>
                                                        Đề bài ngắn
                                                        <textarea
                                                            rows={2}
                                                            value={questionItem.prompt}
                                                            onChange={(event) => handleQuestionChange(index, "prompt", event.target.value)}
                                                            placeholder="Ví dụ: Sắp xếp lại câu: 田中（たなか）さんは先生（せんせい）です"
                                                        />
                                                    </label>
                                                    <label>
                                                        Câu đúng
                                                        <textarea
                                                            rows={3}
                                                            value={questionItem.correctSentence}
                                                            onChange={(event) => handleQuestionChange(index, "correctSentence", event.target.value)}
                                                            placeholder="Ví dụ: 田中（たなか）さんは先生（せんせい）です"
                                                        />
                                                    </label>
                                                    <label className="span-2">
                                                        Từ cần sắp xếp
                                                        <textarea
                                                            rows={3}
                                                            value={questionItem.wordsText}
                                                            onChange={(event) => handleQuestionChange(index, "wordsText", event.target.value)}
                                                            placeholder="Nhập từ/cụm từ, có thể dán luôn inline furigana; cách nhau bởi dấu phẩy hoặc xuống dòng"
                                                        />
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="admin-grammar-fields">
                                                    <label className="span-2">
                                                        Câu hỏi / chỗ trống
                                                        <textarea
                                                            rows={3}
                                                            value={questionItem.question}
                                                            onChange={(event) => handleQuestionChange(index, "question", event.target.value)}
                                                            placeholder="Ví dụ: 田中（たなか）さんは____です。"
                                                        />
                                                    </label>

                                                    <div className="admin-choice-list span-2">
                                                        <p className="small">Nhập 4 đáp án để người học lựa chọn; đáp án cũng có thể dùng inline furigana.</p>
                                                        {questionItem.choices.map((choiceItem, choiceIndex) => {
                                                            const choiceLabel = getAnswerLabel(choiceIndex);

                                                            return (
                                                                <label key={`${questionItem.id}-${choiceLabel}`} className="admin-choice-row">
                                                                    <span className="admin-choice-tag">{choiceLabel}</span>
                                                                    <input
                                                                        value={choiceItem}
                                                                        onChange={(event) => handleChoiceChange(index, choiceIndex, event.target.value)}
                                                                        placeholder={`Đáp án ${choiceLabel}`}
                                                                    />
                                                                </label>
                                                            );
                                                        })}
                                                    </div>

                                                    <label className="span-2">
                                                        Đáp án đúng
                                                        <select
                                                            value={getCorrectAnswerSelection(questionItem)}
                                                            onChange={(event) => handleQuestionChange(index, "correctAnswer", event.target.value)}
                                                        >
                                                            <option value="">Chọn đáp án đúng</option>
                                                            {questionItem.choices.map((choiceItem, choiceIndex) => {
                                                                const choiceLabel = getAnswerLabel(choiceIndex);
                                                                const choiceText = String(choiceItem || "").trim();

                                                                return (
                                                                    <option key={`${questionItem.id}-correct-${choiceLabel}`} value={choiceLabel}>
                                                                        {choiceText ? `${choiceLabel} - ${choiceText}` : choiceLabel}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {module === "mock_test" ? (
                                                <div className="admin-grammar-switcher mb-3" role="tablist" aria-label="Chọn dạng câu hỏi">
                                                    <button
                                                        type="button"
                                                        className={`admin-grammar-switch ${questionItem.questionType !== "reading_comprehension" ? "is-active" : ""}`}
                                                        onClick={() => handleQuestionChange(index, "questionType", "multiple_choice")}
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        Trắc nghiệm
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`admin-grammar-switch ${questionItem.questionType === "reading_comprehension" ? "is-active" : ""}`}
                                                        onClick={() => handleQuestionChange(index, "questionType", "reading_comprehension")}
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        Đọc hiểu
                                                    </button>
                                                </div>
                                            ) : null}

                                            {questionItem.questionType === "reading_comprehension" ? (
                                                <div className="admin-reading-group admin-grammar-fields">
                                                    <label className="span-2">
                                                        Bài đọc
                                                        <textarea
                                                            rows={4}
                                                            value={questionItem.passage}
                                                            onChange={(event) => handleQuestionChange(index, "passage", event.target.value)}
                                                            placeholder={`Nhập đoạn văn đọc hiểu vào đây...`}
                                                        />
                                                    </label>
                                                    
                                                    <div className="admin-sub-questions span-2">
                                                        {(questionItem.subQuestions || []).map((subQ, subIndex) => (
                                                            <div key={subQ.id || subIndex} className="admin-sub-question-card mb-3" style={{ border: "1px dashed var(--border-color)", borderRadius: "12px", padding: "16px", background: "var(--card-bg, #fff)" }}>
                                                                <div className="admin-test-question-card-head mb-3" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                                                                    <strong style={{ color: "var(--primary-color)", fontSize: "0.95rem" }}>Câu {subIndex + 1}</strong>
                                                                    <button
                                                                        type="button"
                                                                        className="admin-icon-btn danger"
                                                                        onClick={() => handleRemoveSubQuestion(index, subIndex)}
                                                                        disabled={saving || loadingTest || (questionItem.subQuestions || []).length <= 1}
                                                                        title="Xóa câu"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                                
                                                                <div className="admin-grammar-fields">
                                                                    <label className="span-2">
                                                                        <textarea
                                                                            rows={2}
                                                                            value={subQ.content}
                                                                            onChange={(event) => handleSubQuestionChange(index, subIndex, "content", event.target.value)}
                                                                            placeholder="Nhập câu hỏi phụ..."
                                                                        />
                                                                    </label>
                                                                    
                                                                    <div className="admin-choice-list span-2">
                                                                        {subQ.choices.map((choiceItem, choiceIndex) => {
                                                                            const choiceLabel = getAnswerLabel(choiceIndex);
                                                                            return (
                                                                                <label key={`${subQ.id}-${choiceLabel}`} className="admin-choice-row">
                                                                                    <span className="admin-choice-tag">{choiceLabel}</span>
                                                                                    <input
                                                                                        value={choiceItem}
                                                                                        onChange={(event) => handleSubQuestionChoiceChange(index, subIndex, choiceIndex, event.target.value)}
                                                                                        placeholder={`Đáp án ${choiceLabel} (có thể dùng inline furigana)`}
                                                                                    />
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    <label className="span-2">
                                                                        Đáp án đúng
                                                                        <select
                                                                            value={subQ.correctAnswer}
                                                                            onChange={(event) => handleSubQuestionChange(index, subIndex, "correctAnswer", event.target.value)}
                                                                        >
                                                                            <option value="">Chọn đáp án đúng</option>
                                                                            <option value="A">A</option>
                                                                            <option value="B">B</option>
                                                                            <option value="C">C</option>
                                                                            <option value="D">D</option>
                                                                        </select>
                                                                    </label>

                                                                    <label className="span-2">
                                                                        Giải thích đáp án
                                                                        <textarea
                                                                            rows={3}
                                                                            value={subQ.explanation || ""}
                                                                            onChange={(event) => handleSubQuestionChange(index, subIndex, "explanation", event.target.value)}
                                                                            placeholder="Giải thích vì sao đáp án này đúng, lưu ý ngữ pháp hoặc cách ghi nhớ..."
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        
                                                        <div style={{ display: "flex", justifyContent: "center", marginTop: "16px", marginBottom: "8px" }}>
                                                            <button 
                                                                type="button" 
                                                                className="admin-btn primary" 
                                                                onClick={() => handleAddSubQuestion(index)}
                                                                disabled={saving || loadingTest}
                                                                style={{ padding: "8px 24px", borderRadius: "24px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                                                            >
                                                                <span style={{ fontSize: "1.2rem", lineHeight: "1" }}>+</span> Thêm câu hỏi
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <textarea
                                                        rows={3}
                                                        value={questionItem.content}
                                                        onChange={(event) => handleQuestionChange(index, "content", event.target.value)}
                                                        placeholder={`Ví dụ: 田中（たなか）さんは先生（せんせい）です`}
                                                    />

                                                    <div className="admin-choice-list">
                                                        {questionItem.choices.map((choiceItem, choiceIndex) => {
                                                            const choiceLabel = getAnswerLabel(choiceIndex);

                                                            return (
                                                                <label key={`${questionItem.id}-${choiceLabel}`} className="admin-choice-row">
                                                                    <span className="admin-choice-tag">{choiceLabel}</span>
                                                                    <input
                                                                        value={choiceItem}
                                                                        onChange={(event) => handleChoiceChange(index, choiceIndex, event.target.value)}
                                                                        placeholder={`Đáp án ${choiceLabel} (có thể dùng inline furigana)`}
                                                                    />
                                                                </label>
                                                            );
                                                        })}
                                                    </div>

                                                    <label>
                                                        <select
                                                            value={questionItem.correctAnswer}
                                                            onChange={(event) => handleQuestionChange(index, "correctAnswer", event.target.value)}
                                                        >
                                                            <option value="">Chọn đáp án đúng</option>
                                                            <option value="A">A</option>
                                                            <option value="B">B</option>
                                                            <option value="C">C</option>
                                                            <option value="D">D</option>
                                                        </select>
                                                    </label>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {questionItem.questionType !== "reading_comprehension" ? (
                                        <label className="mt-3 block">
                                            Giải thích đáp án
                                            <textarea
                                                rows={3}
                                                value={questionItem.explanation || ""}
                                                onChange={(event) => handleQuestionChange(index, "explanation", event.target.value)}
                                                placeholder="Giải thích vì sao đáp án đúng, lưu ý ngữ pháp hoặc cách ghi nhớ..."
                                            />
                                        </label>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

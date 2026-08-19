import mongoose from "mongoose";

const TEST_KINDS = ["mini_practice", "module_exam"];
const TEST_SCOPE_TYPES = ["lesson", "level", "module"];
const TEST_MODULES = ["vocabulary", "kanji", "grammar", "reading", "shadowing", "video", "speaking", "mock_test"];

const questionSchema = new mongoose.Schema({
    type: { type: String, enum: ["multiple_choice", "arrangement", "listening", "arrange", "fill", "reading_comprehension"], required: true },
    question: { type: String },
    prompt: { type: String },
    passage: { type: String },
    formulaWithBlank: { type: String },
    options: [{ type: String }],
    correctAnswer: { type: String },
    correctSentence: { type: String },
    pieces: [
        {
            id: { type: String },
            text: { type: String, required: true },
        },
    ],
    reading: { type: String }, // Hiragana for Kanji toggle feature
    explanation: { type: String },
});

const testSchema = new mongoose.Schema(
    {
        testTitle: { type: String, required: true },
        level: { type: String, required: true },
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", default: null }, // Null means it's a Level Practice Test
        module: {
            type: String,
            enum: TEST_MODULES,
            default: null,
            index: true,
        },
        testKind: {
            type: String,
            enum: TEST_KINDS,
            default: "mini_practice",
            index: true,
        },
        scopeType: {
            type: String,
            enum: TEST_SCOPE_TYPES,
            default: function () {
                if (this.lessonId) {
                    return "lesson";
                }

                if (this.testKind === "module_exam") {
                    return "level";
                }

                if (this.module && this.module !== "mock_test") {
                    return "module";
                }

                return "level";
            },
        },
        scopeId: { type: mongoose.Schema.Types.ObjectId, default: null },
        miniTestGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "MiniTestGroup", default: null, index: true },
        timeLimit: { type: Number }, // In minutes
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
        questions: [questionSchema],
    },
    { timestamps: true }
);

testSchema.pre("validate", function () {
    const totalQuestions = Array.isArray(this.questions) ? this.questions.length : 0;

    if (this.scopeType === "lesson" && !this.lessonId) {
        this.invalidate("lessonId", "lessonId is required when scopeType is lesson");
    }

    if (this.scopeType === "module" && !this.module) {
        this.invalidate("module", "module is required when scopeType is module");
    }

    const isMiniGroupExam = this.testKind === "module_exam" && Boolean(this.miniTestGroupId);

    if (this.testKind === "mini_practice" && (totalQuestions < 15 || totalQuestions > 30)) {
        this.invalidate("questions", "mini_practice requires from 15 to 30 questions");
    }

    if (isMiniGroupExam && (totalQuestions < 15 || totalQuestions > 30)) {
        this.invalidate("questions", "mini group module_exam requires from 15 to 30 questions");
    }

    if (this.testKind === "mini_practice" && this.module !== "mock_test") {
        if (!this.module) {
            this.invalidate("module", "mini_practice must belong to a learning module (not mock_test)");
        }

        if (!this.lessonId) {
            this.invalidate("lessonId", "lessonId is required for mini_practice");
        }

        if (this.scopeType !== "lesson") {
            this.invalidate("scopeType", "mini_practice must use scopeType lesson");
        }
    }

    if (this.testKind === "mini_practice" && this.module === "mock_test") {
        this.invalidate("testKind", "mock test mini group must use module_exam");
    }

    if (this.testKind === "module_exam") {
        if (this.module !== "mock_test") {
            this.invalidate("module", "module_exam must belong to mock_test module");
        }

        if (this.scopeType !== "level") {
            this.invalidate("scopeType", "module_exam must use scopeType level");
        }

        if (this.lessonId) {
            this.invalidate("lessonId", "module_exam must not attach lessonId");
        }

        if (isMiniGroupExam && (!this.timeLimit || this.timeLimit < 1)) {
            this.invalidate("timeLimit", "timeLimit is required");
        }
    }

    if (totalQuestions === 0) {
        this.invalidate("questions", "At least one question is required");
    }

    return;
});

testSchema.index({ module: 1, level: 1, testKind: 1, status: 1, createdAt: -1 });

const Test = mongoose.models.Test || mongoose.model("Test", testSchema);
export default Test;

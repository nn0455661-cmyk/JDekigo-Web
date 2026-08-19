import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        level: { type: String, required: true, index: true },
        module: { type: String, required: true, index: true },
        category: { type: String, enum: ["vocabulary", "kanji", "grammar", "reading"], index: true },
        type: { type: String, enum: ["multiple_choice", "arrange", "fill", "listening", "reading_comprehension"], required: true },
        question: { type: String },
        prompt: { type: String },
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
        reading: { type: String },
        passage: { type: String },
        subQuestions: [
            {
                id: { type: String },
                question: { type: String },
                options: [{ type: String }],
                correctAnswer: { type: String },
                explanation: { type: String },
            },
        ],
        explanation: { type: String },
        status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    },
    { timestamps: true }
);

questionSchema.index({ module: 1, level: 1, status: 1, createdAt: -1 });
questionSchema.index({ module: 1, level: 1, category: 1, status: 1 });

const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

// Keep the nested field available during Next.js development hot reloads,
// where Mongoose may reuse a model compiled before this field was added.
const subQuestionPath = Question.schema.path("subQuestions");
if (subQuestionPath?.schema && !subQuestionPath.schema.path("explanation")) {
    subQuestionPath.schema.add({ explanation: { type: String } });
}

export default Question;

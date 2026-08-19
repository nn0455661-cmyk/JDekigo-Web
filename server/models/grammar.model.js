import mongoose from "mongoose";

const exampleSchema = new mongoose.Schema(
    {
        jp: { type: String, required: true },
        vi: { type: String, required: true },
        dialogueSegments: [{ type: String }],
    },
    { _id: false }
);

const exerciseSchema = new mongoose.Schema({
    type: { type: String, enum: ["arrangement", "multiple_choice"], required: true },
    // For Sentence Arrangement
    correctSentence: { type: String },
    words: [{ type: String }],
    // For Multiple Choice
    question: { type: String },
    options: [{ type: String }],
    correctAnswer: { type: String },
});

const grammarSchema = new mongoose.Schema(
    {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
        structure: { type: String, required: true },
        meaning: { type: String, required: true },
        usage: { type: String },
        notes: { type: String },
        tip: { type: String },
        examples: [exampleSchema],
        exercises: [exerciseSchema], // Inline exercises for the grammar point
        status: { type: String, enum: ["draft", "published"], default: "draft" },
    },
    { timestamps: true }
);

const Grammar = mongoose.models.Grammar || mongoose.model("Grammar", grammarSchema);

// Next.js keeps compiled Mongoose models between development reloads. When a
// field is added to the schema, make sure the already-compiled model also
// receives it instead of silently dropping the value on save.
if (!Grammar.schema.path("tip")) {
    Grammar.schema.add({ tip: { type: String } });
}

export default Grammar;

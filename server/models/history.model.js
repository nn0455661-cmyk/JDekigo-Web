import mongoose from "mongoose";

const testHistorySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        module: { type: String, required: true, index: true }, // vocabulary, kanji, grammar, reading, mock-test
        level: { type: String, required: true, index: true },
        testId: { type: String, required: true },
        testTitle: { type: String },
        type: { type: String }, // test, typing, mock-test
        mockTestType: { type: String, enum: ["full", "mini"], default: undefined },
        testKind: { type: String },
        miniTestGroupId: { type: String },
        correct: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        durationSeconds: { type: Number, default: 0 },
        questions: { type: mongoose.Schema.Types.Mixed },
        answers: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true }
);

const TestHistory = mongoose.models.TestHistory || mongoose.model("TestHistory", testHistorySchema);
export default TestHistory;

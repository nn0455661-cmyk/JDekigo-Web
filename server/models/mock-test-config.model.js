import mongoose from "mongoose";

const mockTestConfigSchema = new mongoose.Schema(
    {
        level: { type: String, required: true, unique: true, index: true },
        distribution: {
            vocabulary: { type: Number, min: 0, default: 10 },
            kanji: { type: Number, min: 0, default: 8 },
            grammar: { type: Number, min: 0, default: 10 },
            reading: { type: Number, min: 0, default: 2 },
        },
        timeLimit: { type: Number, min: 1, default: 30 },
    },
    { timestamps: true }
);

const MockTestConfig = mongoose.models.MockTestConfig || mongoose.model("MockTestConfig", mockTestConfigSchema);

// Next.js dev hot reload can retain a model compiled before a new field is added.
if (!MockTestConfig.schema.path("timeLimit")) {
    MockTestConfig.schema.add({ timeLimit: { type: Number, min: 1, default: 30 } });
}

export default MockTestConfig;

import mongoose from "mongoose";

const speakingItemSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        imageUrl: { type: String, default: "" },
        audioAssetId: { type: String, default: "" },
        audioPublicId: { type: String, default: "" },
        audioProvider: { type: String, enum: ["r2", "mongodb", ""], default: "" },
        audioUrl: { type: String, required: true },
        script: { type: String, default: "" },
        scriptEnabled: { type: Boolean, default: true },
    },
    { _id: true }
);

const readingItemSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        audioAssetId: { type: String, default: "" },
        audioPublicId: { type: String, default: "" },
        audioProvider: { type: String, enum: ["r2", "mongodb", ""], default: "" },
        audioUrl: { type: String, default: "" },
        content: { type: String, required: true },
        contentWithHiragana: { type: String, default: "" },
        romaji: { type: String, default: "" },
        translation: { type: String, default: "" },
    },
    { _id: true }
);

const speakingSchema = new mongoose.Schema(
    {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: false, default: null },
        level: { type: String, default: "" },
        title: { type: String, required: true },
        setOrder: { type: Number, default: 1 },
        speakingItems: { type: [speakingItemSchema], default: [] },
        readingItems: { type: [readingItemSchema], default: [] },
        // Legacy single-speaking fields remain readable for existing records.
        imageUrl: { type: String, default: "" },
        audioAssetId: { type: String, default: "" },
        audioPublicId: { type: String, default: "" },
        audioProvider: { type: String, enum: ["r2", "mongodb", ""], default: "" },
        audioUrl: { type: String, default: "" },
        script: { type: String, default: "" },
        scriptEnabled: { type: Boolean, default: true },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    { timestamps: true }
);

speakingSchema.index({ level: 1, setOrder: 1, createdAt: 1 });

const Speaking = mongoose.models.Speaking || mongoose.model("Speaking", speakingSchema);

// Next.js may reuse an older compiled model during development hot reloads.
[
    Speaking.schema.path("audioProvider"),
    Speaking.schema.path("speakingItems")?.schema?.path("audioProvider"),
    Speaking.schema.path("readingItems")?.schema?.path("audioProvider"),
].filter(Boolean).forEach((schemaPath) => {
    if (!schemaPath.enumValues.includes("r2")) schemaPath.enumValues.unshift("r2");
});

export default Speaking;


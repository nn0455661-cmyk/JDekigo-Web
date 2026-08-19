import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
    {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
        title: { type: String, required: true },
        content: { type: String, required: true }, // Kanji only
        contentWithHiragana: { type: String },
        romaji: { type: String },
        translation: { type: String },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    { timestamps: true }
);

const Reading = mongoose.models.Reading || mongoose.model("Reading", readingSchema);
export default Reading;
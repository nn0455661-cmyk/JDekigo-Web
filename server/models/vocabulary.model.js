import mongoose from "mongoose";

const vocabularySchema = new mongoose.Schema(
    {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
        word: { type: String, required: true },
        reading: { type: String },
        meaning: { type: String, required: true },
        example: { type: String },
        image: { type: String },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    { timestamps: true }
);

const Vocabulary = mongoose.models.Vocabulary || mongoose.model("Vocabulary", vocabularySchema);
export default Vocabulary;
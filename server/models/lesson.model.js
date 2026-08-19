import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
    {
        module: {
            type: String,
            enum: ["vocabulary", "kanji", "grammar", "reading", "shadowing", "video", "speaking"],
            required: true,
            index: true,
        },
        lessonTitle: { type: String, required: true },
        lessonOrder: { type: Number, required: true },
        level: { type: String, required: true }, // e.g., 'JPD113', 'JPD123', 'JPD113'
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    { timestamps: true }
);

const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);
export default Lesson;

import mongoose from "mongoose";

const shadowingSchema = new mongoose.Schema(
    {
        lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: false, default: null },
        level: { type: String, default: "" },
        youtubeVideoId: { type: String, required: true },
        title: { type: String, required: true },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    { timestamps: true }
);

const Shadowing = mongoose.models.Shadowing || mongoose.model("Shadowing", shadowingSchema);
export default Shadowing;

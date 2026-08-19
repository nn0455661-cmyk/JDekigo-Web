import mongoose from "mongoose";

const StudySetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        cards: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: "study_sets",
        versionKey: false,
    }
);

StudySetSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.StudySet || mongoose.model("StudySet", StudySetSchema);
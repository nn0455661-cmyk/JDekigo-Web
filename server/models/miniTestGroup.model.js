import mongoose from "mongoose";

const miniTestGroupSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        level: { type: String, required: true, trim: true, uppercase: true, index: true },
        order: { type: Number, required: true, min: 1, default: 1 },
        status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    },
    { timestamps: true }
);

miniTestGroupSchema.index({ level: 1, order: 1 }, { unique: true });

const MiniTestGroup = mongoose.models.MiniTestGroup || mongoose.model("MiniTestGroup", miniTestGroupSchema);
export default MiniTestGroup;

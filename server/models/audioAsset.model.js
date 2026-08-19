import mongoose from "mongoose";

const audioAssetSchema = new mongoose.Schema(
    {
        fileName: { type: String, default: "" },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        data: { type: Buffer, required: true },
    },
    { timestamps: true }
);

const AudioAsset = mongoose.models.AudioAsset || mongoose.model("AudioAsset", audioAssetSchema);
export default AudioAsset;

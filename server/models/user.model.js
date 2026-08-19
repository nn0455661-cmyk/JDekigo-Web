import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true,
        },
        refreshTokenHash: {
            type: String,
            default: null,
            select: false,
        },
        refreshTokenExpiresAt: {
            type: Date,
            default: null,
            select: false,
        },
        name: {
            type: String,
            trim: true,
            default: "",
        },
        avatar: {
            type: String,
            default: "",
        },
        phone: {
            type: String,
            default: "",
        },
        gender: {
            type: String,
            default: "",
        },
        lastOnlineAt: {
            type: Date,
            default: null,
            index: true,
        },
        lastLoginAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);

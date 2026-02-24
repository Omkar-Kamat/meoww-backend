import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        profileImage: { type: String },
        isVerified: { type: Boolean, default: true },
        refreshTokenHash: { type: String },
    },
    { timestamps: true },
);

export const User = mongoose.model("User", userSchema);

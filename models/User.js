import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../utils/password.js";
import { encrypt, decrypt } from "../utils/encryption/fieldEncryption.js";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
        },

        registrationNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            set: encrypt,
            get: decrypt,
        },

        mobileNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            set: encrypt,
            get: decrypt,
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },

        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isBanned: {
            type: Boolean,
            default: false,
        },

        banExpiresAt: {
            type: Date,
            default: null,
        },

        violationCount: {
            type: Number,
            default: 0,
        },

        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true },
    },
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await hashPassword(this.password);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return comparePassword(candidatePassword, this.password);
};

userSchema.methods.isCurrentlyBanned = function () {
    if (!this.isBanned) return false;

    if (this.banExpiresAt && this.banExpiresAt < new Date()) {
        return false;
    }

    return true;
};

userSchema.index({ email: 1 });
userSchema.index({ registrationNumber: 1 });
userSchema.index({ mobileNumber: 1 });
userSchema.index({ isBanned: 1, banExpiresAt: 1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ _id: 1, isBanned: 1, banExpiresAt: 1 });

userSchema.pre(/^find/, function(next) {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    next();
});

const User = mongoose.model("User", userSchema);

export default User;

import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["VERIFY_ACCOUNT", "LOGIN", "RESET_PASSWORD"],
      required: true,
    },

    hashedOtp: {
      type: String,
      required: true,
      select: false,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

otpSchema.index({ user: 1, type: 1 });

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;

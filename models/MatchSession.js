import mongoose from "mongoose";

const matchSessionSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ENDED"],
      default: "ACTIVE",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

matchSessionSchema.index({ userA: 1, status: 1 });
matchSessionSchema.index({ userB: 1, status: 1 });
matchSessionSchema.index({ status: 1, startedAt: -1 });
matchSessionSchema.index({ deletedAt: 1 });
matchSessionSchema.index({ status: 1, userA: 1, userB: 1 });
matchSessionSchema.index({ status: 1, createdAt: -1 });

matchSessionSchema.pre(/^find/, function(next) {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    next();
});

const MatchSession = mongoose.model(
  "MatchSession",
  matchSessionSchema
);

export default MatchSession;

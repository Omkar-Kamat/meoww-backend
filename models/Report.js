import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MatchSession",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "REVIEWED"],
      default: "PENDING",
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

reportSchema.index(
  { reporter: 1, reportedUser: 1, session: 1 },
  { unique: true }
);
reportSchema.index({ reportedUser: 1, createdAt: -1 });
reportSchema.index({ status: 1 });
reportSchema.index({ deletedAt: 1 });
reportSchema.index({ reportedUser: 1, status: 1 });

reportSchema.pre(/^find/, function(next) {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    next();
});

const Report = mongoose.model("Report", reportSchema);

export default Report;
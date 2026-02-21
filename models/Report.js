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
  },
  {
    timestamps: true,
  }
);

reportSchema.index(
  { reporter: 1, reportedUser: 1, session: 1 },
  { unique: true }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
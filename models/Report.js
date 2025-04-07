const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["book", "user"], required: true },
    reportedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "type",
    },
    reason: { type: String, required: true },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, enum: ["pending", "reviewed"], default: "pending" },
    actionTaken: {
      type: String,
      enum: ["none", "warned", "blocked", "deleted"],
      default: "none",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);

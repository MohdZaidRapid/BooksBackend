const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // receiver
    type: {
      type: String,
      enum: ["message", "interest", "admin", "book"],
      required: true,
    },
    content: { type: String, required: true },
    link: { type: String }, // Optional: redirect frontend
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);

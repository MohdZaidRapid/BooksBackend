const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // renamed from 'user'
    type: {
      type: String,
      enum: ["message", "interest", "admin", "book", "chat"],
      required: true,
    },
    content: { type: String, required: true },
    link: { type: String }, // Optional: redirect frontend
    read: { type: Boolean, default: false },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);

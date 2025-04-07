const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
    lastMessage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);

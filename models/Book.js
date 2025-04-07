const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: String,
    description: String,
    image: String,
    price: Number,
    condition: { type: String, enum: ["new", "used"], default: "used" },
    isFree: { type: Boolean, default: false },
    listedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    country: String,
    city: String,
    area: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);

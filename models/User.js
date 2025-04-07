const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    country: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    isBlocked: { type: Boolean, default: false },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
    college: { type: String }, // Optional
    profilePic: { type: String, default: "" }, // Cloudinary URL
    isVerified: { type: Boolean, default: false }, // Email verification
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password for login
UserSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);

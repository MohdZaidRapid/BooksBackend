const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const protect = require("../middleware/auth");

const router = express.Router();

const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

// @route   POST /api/auth/register
// @desc    Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, country, city, area } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = new User({ name, email, password, country, city, area });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password)))
    return res.status(400).json({ message: "Invalid credentials" });

  const accessToken = generateAccessToken(user._id);
  // const refreshToken = generateRefreshToken(user._id);

  // // send refreshToken in httpOnly cookie
  // res.cookie("refreshToken", refreshToken, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   sameSite: "strict",
  //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  // });

  res.json({ user, token: accessToken });
});

router.get("/profile", protect, (req, res) => {
  res.json(req.user);
});

router.get("/me", protect, async (req, res) => {
  try {
    console.log(req.user._id);
    const user = await User.findById(req.user._id).select("-password"); // remove password
    console.log(user);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    console.error("Get Current User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// router.post("/refresh-token", (req, res) => {
//   const token = req.cookies.refreshToken;
//   if (!token) return res.status(401).json({ message: "No refresh token" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
//     const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
//       expiresIn: "15m",
//     });

//     res.json({ accessToken });
//   } catch (err) {
//     return res.status(403).json({ message: "Invalid refresh token" });
//   }
// });

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ message: "Logged out successfully" });
});

module.exports = router;

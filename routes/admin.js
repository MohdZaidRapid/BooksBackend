const express = require("express");
const User = require("../models/User");
const Book = require("../models/Book");
const adminAuth = require("../middleware/admin");
const { setCache, getCache } = require("../utils/cache");
const { getIO } = require("../socket");

const router = express.Router();

// GET all users (search, sort, pagination)
router.get("/users", adminAuth, async (req, res) => {
  const {
    search = "",
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 10,
  } = req.query;
  const skip = (page - 1) * limit;

  const cacheKey = `users:${search}:${sort}:${order}:${page}:${limit}`;
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const users = await User.aggregate([
    { $match: { name: { $regex: search, $options: "i" } } },
    { $sort: { [sort]: order === "asc" ? 1 : -1 } },
    { $skip: parseInt(skip) },
    { $limit: parseInt(limit) },
  ]);

  const total = await User.countDocuments({
    name: { $regex: search, $options: "i" },
  });

  const response = { total, page: Number(page), users };
  await setCache(cacheKey, response);

  res.json(response);
});

// Block or unblock a user
router.patch("/users/:id/block", adminAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ msg: "User not found" });

  user.isBlocked = !user.isBlocked;
  await user.save();

  // Send real-time notification via socket
  if (user.isBlocked) {
    const io = getIO();
    io.to(user._id.toString()).emit("forceLogout", {
      msg: "You have been blocked by admin. Logging out in 30 seconds...",
    });
  }

  res.json({ msg: `User ${user.isBlocked ? "blocked" : "unblocked"}` });
});

// DELETE a user
router.delete("/users/:id", adminAuth, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ msg: "User deleted" });
});

// GET all books
router.get("/books", adminAuth, async (req, res) => {
  const {
    search = "",
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 10,
  } = req.query;
  const skip = (page - 1) * limit;

  const books = await Book.aggregate([
    {
      $match: {
        title: { $regex: search, $options: "i" },
      },
    },
    { $sort: { [sort]: order === "asc" ? 1 : -1 } },
    { $skip: parseInt(skip) },
    { $limit: parseInt(limit) },
  ]);

  const total = await Book.countDocuments({
    title: { $regex: search, $options: "i" },
  });

  res.json({ total, page: Number(page), books });
});

// DELETE a book
router.delete("/books/:id", adminAuth, async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ msg: "Book deleted" });
});

module.exports = router;

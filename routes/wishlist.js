const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Book = require("../models/Book");
const sendNotification = require("../utils/sendNotification");

const router = express.Router();

// Add or remove from wishlist (toggle)
router.patch("/toggle/:bookId", auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const bookId = req.params.bookId;

  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ msg: "Book not found" });

  const index = user.wishlist.indexOf(bookId);
  if (index > -1) {
    user.wishlist.splice(index, 1);
    await user.save();
    return res.json({ msg: "Removed from wishlist" });
  } else {
    user.wishlist.push(bookId);
    await user.save();

    // 🛎️ Send notification to book owner
    if (book.owner.toString() !== req.user._id.toString()) {
      await sendNotification({
        userId: book.owner,
        message: `${user.name} added your book "${book.title}" to their wishlist`,
        type: "wishlist",
        fromUser: req.user._id,
      });
    }

    return res.json({ msg: "Added to wishlist" });
  }
});

// Get all wishlisted books with pagination
router.get("/", auth, async (req, res) => {
  const {
    search = "",
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.user._id).populate({
    path: "wishlist",
    match: { title: { $regex: search, $options: "i" } },
    options: {
      sort: { [sort]: order === "asc" ? 1 : -1 },
      skip: parseInt(skip),
      limit: parseInt(limit),
    },
  });

  const total = user.wishlist.length;
  res.json({
    total,
    page: Number(page),
    books: user.wishlist,
  });
});

// Check if book is in wishlist
router.get("/check/:bookId", auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const isWishlisted = user.wishlist.includes(req.params.bookId);
  res.json({ isWishlisted });
});

module.exports = router;

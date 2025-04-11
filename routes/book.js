const express = require("express");
const Book = require("../models/Book");
const mongoose = require("mongoose");
const { clearCache, getCache, setCache } = require("../utils/cache");
const protect = require("../middleware/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const router = express.Router();

// 🔼 Add Book
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      image,
      price,
      condition,
      isFree,
      country,
      city,
      area,
    } = req.body;

    const newBook = await Book.create({
      title,
      author,
      description,
      image,
      price,
      condition,
      isFree,
      country,
      city,
      area,
      listedBy: req.user._id,
    });
    await clearCache("books:*");
    res.status(201).json(newBook);
  } catch (error) {
    console.error("Create Book Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔍 Get Books with Search, Sort, Pagination, Area Filter
router.get("/", async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const sort = req.query.sort || "createdAt";
    const order = req.query.order === "asc" ? "asc" : "desc";
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const country = req.query.country?.trim() || null;
    const city = req.query.city?.trim() || null;
    const area = req.query.area?.trim() || null;

    const skip = (page - 1) * limit;

    const cacheKey = `books:${search || "none"}:${country || "any"}:${
      city || "any"
    }:${area || "any"}:${sort}:${order}:${page}:${limit}`;

    // Always fetch from DB first
    const match = {};

    if (search) {
      match.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (country) match.country = country;
    if (city) match.city = city;
    if (area) match.area = area;

    const pipeline = [
      { $match: match },
      { $sort: { [sort]: order === "asc" ? 1 : -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const books = await Book.aggregate(pipeline);
    const total = await Book.countDocuments(match);

    const response = {
      total,
      page,
      books,
    };

    // Save to cache
    await setCache(cacheKey, response, 600); // 10 mins
    console.log("Cache set!");

    // Now return from cache to maintain consistent behavior
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log("Returning from cache");
      return res.json(cached);
    }

    // Fallback: return raw response if somehow cache retrieval fails
    res.json(response);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const books = await Book.find({ listedBy: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(books);
  } catch (err) {
    console.error("Get My Books Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const bookId = req.params.id;

    const book = await Book.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(bookId) } },
      {
        $lookup: {
          from: "users",
          localField: "listedBy",
          foreignField: "_id",
          as: "listedBy",
        },
      },
      { $unwind: "$listedBy" },
      {
        $project: {
          title: 1,
          author: 1,
          description: 1,
          price: 1,
          image: 1,
          condition: 1,
          isFree: 1,
          country: 1,
          city: 1,
          area: 1,
          createdAt: 1,
          listedBy: {
            _id: 1,
            name: 1,
            email: 1,
          },
        },
      },
    ]);

    if (!book.length) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book[0]);
  } catch (error) {
    console.error("Fetch Book Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.listedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    Object.assign(book, req.body);
    await book.save();

    // Optional: clear cache if you cache individual book or list
    res.json(book);
  } catch (err) {
    console.error("Update Book Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedBook = await Book.findOneAndDelete({
      _id: req.params.id,
      listedBy: req.user._id,
    });

    if (!deletedBook) {
      return res
        .status(404)
        .json({ message: "Book not found or unauthorized" });
    }

    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error("Delete Book Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;

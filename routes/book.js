const express = require("express");
const Book = require("../models/Book");
const mongoose = require("mongoose");
const { clearCache, getCache, setCache } = require("../utils/cache");
const protect = require("../middleware/auth");
const authMiddleware = require("../middleware/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUtils");
const fs = require("fs");

const router = express.Router();

const dir = "./uploads";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 🔼 Add Book
router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      price,
      isFree,
      condition,
      country,
      city,
      area,
    } = req.body;

    // Create book without image first
    const bookData = {
      title,
      author,
      description,
      price: price || 0,
      isFree: isFree === true,
      condition,
      country,
      city,
      area,
      listedBy: req.user.id, // Assuming user ID is stored in req.user from authMiddleware
    };

    // If image was uploaded, process it
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.path);
        bookData.image = result.secure_url; // Store only the URL in your schema
      } catch (uploadError) {
        console.error("Error uploading to Cloudinary:", uploadError);
        return res.status(500).json({
          message: "Error uploading image",
          error: uploadError.message,
        });
      }
    }

    // Save book to database
    const book = new Book(bookData);
    await book.save();

    res.status(201).json(book);
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(500).json({ message: err.message });
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

router.get("/me", authMiddleware, async (req, res) => {
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

router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    // Check if book exists
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Check if user is owner of book
    if (book.listedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this book" });
    }

    // Update fields from request body
    const {
      title,
      author,
      description,
      price,
      isFree,
      condition,
      country,
      city,
      area,
    } = req.body;

    if (title) book.title = title;
    if (author) book.author = author;
    if (description) book.description = description;
    if (price !== undefined) book.price = price;
    if (isFree !== undefined) book.isFree = isFree === true;
    if (condition) book.condition = condition;
    if (country) book.country = country;
    if (city) book.city = city;
    if (area) book.area = area;

    // Handle image update if provided
    if (req.file) {
      try {
        // If there's an existing image, delete it from Cloudinary
        if (book.image) {
          await deleteFromCloudinary(book.image);
        }

        // Upload new image
        const result = await uploadToCloudinary(req.file.path);
        book.image = result.secure_url;
      } catch (uploadError) {
        console.error("Error updating image in Cloudinary:", uploadError);
        return res.status(500).json({
          message: "Error updating image",
          error: uploadError.message,
        });
      }
    }

    // Save updated book
    const updatedBook = await book.save();
    res.json(updatedBook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a book
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Check if user is owner of book
    if (book.listedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this book" });
    }

    // Delete image from Cloudinary if exists
    if (book.image) {
      await deleteFromCloudinary(book.image);
    }

    // Delete book from database
    await Book.findByIdAndDelete(req.params.id);

    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const books = await Book.find({ listedBy: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my books (books listed by logged in user)
router.get("/my/books", authMiddleware, async (req, res) => {
  try {
    const books = await Book.find({ listedBy: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search books
router.get("/search/:term", async (req, res) => {
  try {
    const searchTerm = req.params.term;
    const regex = new RegExp(searchTerm, "i");

    const books = await Book.find({
      $or: [
        { title: { $regex: regex } },
        { author: { $regex: regex } },
        { description: { $regex: regex } },
      ],
    })
      .populate("listedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

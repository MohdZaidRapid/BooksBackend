const express = require("express");
const Chat = require("../models/Chat");
const Book = require("../models/Book");
const protect = require("../middleware/auth");

const router = express.Router();

// 💬 Start chat on book click
router.post("/start", protect, async (req, res) => {
  const { bookId } = req.body;

  try {
    const book = await Book.findById(bookId);

    if (!book) return res.status(404).json({ message: "Book not found" });

    const existingChat = await Chat.findOne({
      participants: { $all: [req.user._id, book.listedBy] },
      book: bookId,
    });

    if (existingChat) return res.json(existingChat);

    const newChat = await Chat.create({
      participants: [req.user._id, book.listedBy],
      book: bookId,
      lastMessage: "I want to buy this book",
    });

    res.status(201).json(newChat);
  } catch (err) {
    console.error("Chat Start Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate("book", "title")
      .populate("participants", "name email")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chats" });
  }
});

// 💬 Get Messages for a Chat
router.get("/:chatId/messages", protect, async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

module.exports = router;

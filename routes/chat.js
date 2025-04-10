const express = require("express");
const Chat = require("../models/Chat");
const Book = require("../models/Book");
const protect = require("../middleware/auth");
const Message = require("../models/Message");

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
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name email")
    .sort({ createdAt: 1 });

  res.json(messages);
});

// ✅ Get a single chat by ID
router.get("/:chatId", protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("book", "title")
      .populate("participants", "name email");

    if (!chat) return res.status(404).json({ message: "Chat not found" });

    // Optional: Ensure user is part of this chat
    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );
    if (!isParticipant)
      return res.status(403).json({ message: "Access denied" });

    res.json(chat);
  } catch (error) {
    console.error("Chat fetch error:", error);
    res.status(500).json({ message: "Error fetching chat" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate("participants", "name email")
      .populate("book", "title image")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to get chats" });
  }
});

module.exports = router;

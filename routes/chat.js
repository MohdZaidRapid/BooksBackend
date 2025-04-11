const express = require("express");
const Chat = require("../models/Chat");
const Book = require("../models/Book");
const protect = require("../middleware/auth");
const Message = require("../models/Message");
const { default: mongoose } = require("mongoose");

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

router.get("/book/:bookId", protect, async (req, res) => {
  try {
    const { bookId } = req.params;

    // First verify the book exists and belongs to the user
    const book = await Book.findOne({
      _id: bookId,
      listedBy: req.user._id,
    });

    if (!book) {
      return res.status(404).json({
        message:
          "Book not found or you don't have permission to view these messages",
      });
    }

    // Find all chats related to this book
    const chats = await Chat.find({
      book: bookId,
      participants: req.user._id,
    }).populate("participants", "name email");

    // Get all messages from these chats
    const chatIds = chats.map((chat) => chat._id);

    const messages = await Message.aggregate([
      {
        $match: {
          chat: { $in: chatIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderDetails",
        },
      },
      { $unwind: "$senderDetails" },
      {
        $lookup: {
          from: "chats",
          localField: "chat",
          foreignField: "_id",
          as: "chatDetails",
        },
      },
      { $unwind: "$chatDetails" },
      {
        $sort: { createdAt: 1 },
      },
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          chat: 1,
          sender: {
            _id: "$senderDetails._id",
            name: "$senderDetails.name",
            email: "$senderDetails.email",
          },
          chatWithUser: {
            $filter: {
              input: "$chatDetails.participants",
              as: "participant",
              cond: { $ne: ["$$participant", req.user._id] },
            },
          },
        },
      },
    ]);

    // Group messages by chat/user
    const messagesByChat = {};

    for (const chat of chats) {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      );

      messagesByChat[chat._id] = {
        chatId: chat._id,
        user: otherUser,
        messages: [],
      };
    }

    // Add messages to their respective chats
    for (const message of messages) {
      const chatId = message.chat.toString();
      if (messagesByChat[chatId]) {
        messagesByChat[chatId].messages.push({
          _id: message._id,
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt,
        });
      }
    }

    res.json(Object.values(messagesByChat));
  } catch (error) {
    console.error("Error fetching book messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// routes/onlineStatusRoutes.js

const express = require("express");
const router = express.Router();
const { isUserOnline, getOnlineUsers } = require("../socket/index");
const authMiddleware = require("../middleware/auth");

// Get online status of a specific user
router.get("/status/:userId", authMiddleware, (req, res) => {
  const { userId } = req.params;
  const isOnline = isUserOnline(userId);

  res.json({
    userId,
    isOnline,
  });
});

// Get all currently online users
router.get("/all", authMiddleware, (req, res) => {
  const onlineUsers = getOnlineUsers();
  res.json({ onlineUsers });
});

module.exports = router;

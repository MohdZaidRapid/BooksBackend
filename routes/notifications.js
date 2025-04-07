const express = require("express");
const auth = require("../middleware/auth");
const Notification = require("../models/Notification");

const router = express.Router();

// 🔔 Get all notifications (with optional unread filter)
router.get("/", auth, async (req, res) => {
  const { unreadOnly = false } = req.query;

  const query = { receiver: req.user._id };
  if (unreadOnly === "true") query.read = false;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(notifications);
});

// ✅ Mark a notification as read
router.patch("/:id/read", auth, async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, receiver: req.user._id },
    { read: true }
  );
  res.json({ msg: "Notification marked as read" });
});

// ✅ Mark all as read
router.patch("/read/all", auth, async (req, res) => {
  await Notification.updateMany(
    { receiver: req.user._id, read: false },
    { $set: { read: true } }
  );
  res.json({ msg: "All notifications marked as read" });
});

module.exports = router;

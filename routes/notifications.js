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

router.patch("/message/read", auth, async (req, res) => {
  const { chatLink } = req.body;
  await Notification.updateMany(
    { receiver: req.user._id, link: chatLink, read: false }, // ✅ FIXED
    { $set: { read: true } }
  );
  res.sendStatus(200);
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

// ✅ Get unread notification count
router.get("/unread-count", auth, async (req, res) => {
  console.log("✅ Count request for user:", req.user._id); // <== Add this

  const count = await Notification.countDocuments({
    receiver: req.user._id,
    read: false,
  });

  console.log("🔢 Unread count:", count); // <== And this

  res.json({ count });
});

router.get("/unread-senders", auth, async (req, res) => {
  const notifications = await Notification.aggregate([
    { $match: { receiver: req.user._id, read: false } }, // ✅ FIXED
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$sender",
        count: { $sum: 1 },
        latestMessage: { $first: "$content" },
        latestTime: { $first: "$createdAt" },
        chatLink: { $first: "$link" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "senderInfo",
      },
    },
    { $unwind: "$senderInfo" },
    {
      $project: {
        senderId: "$_id",
        name: "$senderInfo.name",
        count: 1,
        latestMessage: 1,
        chatLink: 1,
        latestTime: 1,
      },
    },
    { $sort: { latestTime: -1 } },
  ]);

  res.json(notifications);
});

module.exports = router;

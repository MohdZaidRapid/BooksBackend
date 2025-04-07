const express = require("express");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/admin");
const Report = require("../models/Report");
const User = require("../models/User");
const Book = require("../models/Book");

const router = express.Router();

// 📢 Report a book or user
router.post("/", auth, async (req, res) => {
  const { type, reportedId, reason } = req.body;

  if (!["book", "user"].includes(type)) {
    return res.status(400).json({ msg: "Invalid report type" });
  }

  const exists =
    type === "book"
      ? await Book.findById(reportedId)
      : await User.findById(reportedId);
  if (!exists) return res.status(404).json({ msg: `${type} not found` });

  const report = await Report.create({
    type,
    reportedId,
    reason,
    reporter: req.user._id,
  });

  res.status(201).json({ msg: "Report submitted", report });
});

// 👀 Admin: View all reports
router.get("/", adminAuth, async (req, res) => {
  const {
    type,
    search = "",
    status,
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;
  const skip = (page - 1) * limit;

  const match = {};
  if (type) match.type = type;
  if (status) match.status = status;

  const reports = await Report.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "reporter",
        foreignField: "_id",
        as: "reporterDetails",
      },
    },
    { $unwind: "$reporterDetails" },
    { $sort: { [sort]: order === "asc" ? 1 : -1 } },
    { $skip: parseInt(skip) },
    { $limit: parseInt(limit) },
  ]);

  const total = await Report.countDocuments(match);
  res.json({ total, page: Number(page), reports });
});

// 🔨 Admin action: warn, block, or delete
router.patch("/:id/action", adminAuth, async (req, res) => {
  const { action } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ msg: "Report not found" });

  // Handle actions
  if (action === "warned") {
    report.status = "reviewed";
    report.actionTaken = "warned";
  } else if (action === "blocked") {
    if (report.type === "user") {
      await User.findByIdAndUpdate(report.reportedId, { isBlocked: true });
    }
    report.status = "reviewed";
    report.actionTaken = "blocked";
  } else if (action === "deleted") {
    if (report.type === "user") {
      await User.findByIdAndDelete(report.reportedId);
    } else if (report.type === "book") {
      await Book.findByIdAndDelete(report.reportedId);
    }
    report.status = "reviewed";
    report.actionTaken = "deleted";
  } else {
    return res.status(400).json({ msg: "Invalid action" });
  }

  await report.save();
  res.json({ msg: `Action '${action}' taken on report`, report });
});

module.exports = router;

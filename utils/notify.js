const Notification = require("../models/Notification");
const { getIO } = require("../socket");

const sendNotification = async ({ userId, type, content, link }) => {
  const notif = await Notification.create({
    user: userId,
    type,
    content,
    link,
  });

  // Emit in real-time
  const io = getIO();
  io.to(userId.toString()).emit("notification", notif);
};

module.exports = sendNotification;

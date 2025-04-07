const Notification = require("../models/Notification");
const { getIO } = require("../socket");

const sendNotification = async ({ userId, message, type, refId, fromUser }) => {
  const notification = await Notification.create({
    receiver: userId,
    text: message,
    type,
    refId,
    from: fromUser,
  });

  // ✅ Real-time emit via socket if user is connected
  const io = getIO();
  io.to(userId.toString()).emit("newNotification", notification);

  return notification;
};

module.exports = sendNotification;

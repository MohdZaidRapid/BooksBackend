const { Server } = require("socket.io");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");

let ioInstance;

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // In production, replace with frontend domain
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // ✅ Join user's private room for real-time notifications
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`👤 User ${userId} joined their private room`);
      }
    });

    // 💬 Handle chat message
    socket.on(
      "sendMessage",
      async ({ chatId, senderId, content, receiverId, senderName }) => {
        try {
          const message = await Message.create({
            chat: chatId,
            sender: senderId,
            content,
          });

          await Chat.findByIdAndUpdate(chatId, {
            lastMessage: content,
            updatedAt: new Date(),
          });

          // 👉 Emit to receiver
          io.to(receiverId.toString()).emit("receiveMessage", {
            chatId,
            senderId,
            content,
            createdAt: new Date(),
          });

          // 🔔 Create + send notification
          const notification = await Notification.create({
            receiver: receiverId,
            type: "chat",
            refId: message._id,
            text: `${senderName || "Someone"} sent you a message.`,
          });

          io.to(receiverId.toString()).emit("newNotification", notification);
        } catch (err) {
          console.error("❌ Error sending message via socket:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("🚫 User disconnected:", socket.id);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized yet");
  }
  return ioInstance;
}

module.exports = { initializeSocket, getIO };

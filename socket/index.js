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

    socket.on("joinRoom", (chatId) => {
      if (chatId) {
        socket.join(chatId.toString());
        console.log(`💬 Joined chat room ${chatId}`);
      }
    });

    // 💬 Handle chat message
    socket.on(
      "sendMessage",
      async ({ chatId, senderId, receiverId, content }) => {
        try {
          // Save message to DB
          const message = await Message.create({
            chat: chatId,
            sender: senderId,
            content,
          });

          const populatedMessage = await message.populate(
            "sender",
            "name email"
          );

          // Emit to sender and receiver so both see the message live
          io.to(senderId).emit("receiveMessage", populatedMessage);
          io.to(receiverId).emit("receiveMessage", populatedMessage);

          // Optional: create a notification for receiver
          await Notification.create({
            receiver: receiverId, // receiver (you already have this)
            sender: senderId, // NEW FIELD – add this to Notification schema
            type: "message",
            content: content, // or `New message from ${populatedMessage.sender.name}`
            link: `/chat/${chatId}`,
          });
        } catch (err) {
          console.error("Error sending message via socket:", err);
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

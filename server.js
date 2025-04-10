const http = require("http");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/book");
const chatRoutes = require("./routes/chat");
const adminRoutes = require("./routes/admin");
const rateLimiter = require("./middleware/rateLimiter");
const cookieParser = require("cookie-parser");

const { initializeSocket } = require("./socket");
const morgan = require("morgan");

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173", // ✅ use your frontend URL here
    credentials: true, // ✅ allow credentials (cookies, headers)
  })
);
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
}

app.use(rateLimiter);
app.use(helmet());
app.use(cookieParser());

// Home Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/wishlist", require("./routes/wishlist"));
app.use("/api/reports", require("./routes/report"));

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

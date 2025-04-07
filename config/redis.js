const { createClient } = require("redis");

const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
  // Optional enhancements:
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000), // Reconnection delay
  },
});

// Error handling
redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("reconnecting", () => console.log("Redis reconnecting..."));

// Async connection with error handling
async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
}

connectRedis();

module.exports = redisClient;

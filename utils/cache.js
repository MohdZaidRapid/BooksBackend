const redis = require("../config/redis");

const setCache = async (key, data, ttl = 3600) => {
  await redis.set(key, JSON.stringify(data), { EX: ttl }); // 1 hour default
};

const getCache = async (key) => {
  console.log(key);
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

const clearCache = async (key) => {
  await redis.del(key);
};

module.exports = { setCache, getCache, clearCache };

const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
  await redisClient.connect();
})();

// Promisify Redis commands
const rPush = redisClient.rPush.bind(redisClient);
const lRange = redisClient.lRange.bind(redisClient);
const del = redisClient.del.bind(redisClient);
const set = redisClient.set.bind(redisClient);
const get = redisClient.get.bind(redisClient);

module.exports = {
  redisClient,
  rPush,
  lRange,
  del,
  set,
  get
};
const redis = require('redis');

let redisClient;

function createRedisClient() {
  if (!redisClient) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
  }
  return redisClient;
}

async function connectRedis() {
  const client = createRedisClient();
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

module.exports = {
  connectRedis,
  rPush: (...args) => createRedisClient().rPush(...args),
  lRange: (...args) => createRedisClient().lRange(...args),
  del: (...args) => createRedisClient().del(...args),
  set: (...args) => createRedisClient().set(...args),
  get: (...args) => createRedisClient().get(...args)
};
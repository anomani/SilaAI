const Queue = require('bull');

const messageQueue = new Queue('message-queue', process.env.REDIS_URL);

module.exports = { messageQueue };
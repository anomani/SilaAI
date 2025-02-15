const Queue = require('bull');
const { handleUserInputData } = require('../ai/clientData');

// Create Bull queues with proper configuration
const openaiQueue = new Queue('openai-queue', process.env.REDIS_URL, {
  settings: {
    lockDuration: 300000, // 5 minutes
    stalledInterval: 30000, // 30 seconds
    maxStalledCount: 3,
    lockRenewTime: 15000, // 15 seconds
    retryProcessDelay: 5000, // 5 seconds
  },
  limiter: {
    max: 10, // max number of jobs processed
    duration: 1000 // per second
  }
});

const messageQueue = new Queue('message-queue', process.env.REDIS_URL, {
  settings: {
    lockDuration: 300000, // 5 minutes
    stalledInterval: 30000, // 30 seconds
    maxStalledCount: 3,
    lockRenewTime: 15000, // 15 seconds
    retryProcessDelay: 5000, // 5 seconds
  },
  limiter: {
    max: 5, // max number of messages
    duration: 1000 // per second
  }
});

// Process OpenAI jobs
openaiQueue.process(async (job) => {
  console.log(`Processing OpenAI job ${job.id}`);
  const { message, userId, initialMessage = false } = job.data;

  try {
    // Update job progress
    await job.progress(10);

    // Use existing handleUserInputData function
    const response = await handleUserInputData(message, userId, initialMessage);

    // Update job progress
    await job.progress(100);

    console.log(`OpenAI job ${job.id} completed successfully`);
    return response;

  } catch (error) {
    console.error(`Error processing OpenAI job ${job.id}:`, error);
    throw error;
  }
});

// Handle OpenAI queue events
openaiQueue.on('completed', (job, result) => {
  console.log(`OpenAI job ${job.id} completed with result:`, result);
});

openaiQueue.on('failed', (job, error) => {
  console.error(`OpenAI job ${job.id} failed with error:`, error);
});

openaiQueue.on('error', (error) => {
  console.error('OpenAI queue error:', error);
});

// Handle message queue events
messageQueue.on('completed', (job) => {
  console.log(`Message job ${job.id} completed`);
});

messageQueue.on('failed', (job, err) => {
  console.log(`Message job ${job.id} failed with error ${err.message}`);
});

messageQueue.on('error', (error) => {
  console.error('Message queue error:', error);
});

// Export queues
module.exports = {
  messageQueue,
  openaiQueue
};
console.log('Worker started with proper queue configuration');
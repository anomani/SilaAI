const Queue = require('bull');
const { processOpenAIJob } = require('../ai/openaiProcessor');

console.log('Initializing worker with OpenAI processor:', processOpenAIJob ? 'Available' : 'Not available');

// Get Redis URL from environment, fallback to local Redis if not available
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log('Using Redis URL:', REDIS_URL.replace(/redis:\/\/.*@/, 'redis://****@')); // Log URL safely

// Create OpenAI queue with proper configuration
const openaiQueue = new Queue('openai-queue', REDIS_URL, {
  redis: {
    tls: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    retryStrategy: function (times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },
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

const messageQueue = new Queue('message-queue', REDIS_URL, {
  redis: {
    tls: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    retryStrategy: function (times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },
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
  console.log('Job data:', job.data);
  
  const { message, userId, threadId } = job.data;

  try {
    const response = await processOpenAIJob(message, userId, threadId);
    console.log(`OpenAI job ${job.id} completed successfully:`, response);
    
    // Ensure we always return a properly structured response
    return {
      status: 'completed',
      message: response.message || null,
      threadId: response.threadId || null,
      error: response.error || null
    };
  } catch (error) {
    console.error(`Error processing OpenAI job ${job.id}:`, error);
    // Return a properly structured error response
    return {
      status: 'failed',
      error: error.message || 'Unknown error occurred',
      message: null,
      threadId: null
    };
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

console.log('Worker started with OpenAI queue configuration');
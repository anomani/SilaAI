const { messageQueue } = require('./twilio');

messageQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

messageQueue.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed with error ${err.message}`);
});

console.log('Worker started');
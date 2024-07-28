require('dotenv').config();
const app = require('../src/app');
const { connectRedis } = require('../src/config/redis');

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Wait for Redis to connect
    await connectRedis();
    console.log('Connected to Redis');

    // Start your Express server
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.error('Redis URL:', process.env.REDIS_URL);
    process.exit(1);
  }
}

startServer();
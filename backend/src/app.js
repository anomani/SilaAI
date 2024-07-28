require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');  // Import body-parser
const followupRoutes = require('./routes/followupRoutes');
const chatRoutes = require('./routes/chatRoutes');  // Import chat routes
const appointmentRoutes = require('./routes/appointmentRoutes');
const clientRoutes = require('./routes/clientRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const aiPromptRoutes = require('./routes/aiPromptRoutes');
const noteRoutes = require('./routes/notesRoutes');

const app = express();

app.use(bodyParser.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Routes
app.use('/api/followup', followupRoutes);
app.use('/api/chat', chatRoutes);  
app.use('/api', appointmentRoutes);
app.use('/api', clientRoutes);
app.use('/api', tokenRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/ai-prompt', aiPromptRoutes);
app.use('/api/notes', noteRoutes);

const { redisClient } = require('./config/redis');

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Wait for Redis to connect
    await redisClient.connect();
    console.log('Connected to Redis');

    // Start your Express server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.error('Redis URL:', process.env.REDIS_URL);
    process.exit(1);
  }
}

startServer();

module.exports = app;
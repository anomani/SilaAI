const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const followupRoutes = require('./routes/followupRoutes');
const chatRoutes = require('./routes/chatRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const clientRoutes = require('./routes/clientRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const aiPromptRoutes = require('./routes/aiPromptRoutes');
const noteRoutes = require('./routes/notesRoutes');
const cronJobs = require('./config/cronJobs');  // Import the cron jobs
const mediaRoutes = require('./routes/mediaRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const authenticateToken = require('./middleware/authMiddleware');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("Uzi Barber App"));

// Add logging middleware for /api routes
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes

app.use('/api/followup', followupRoutes);
app.use('/api/chat', chatRoutes);  
app.use('/api', appointmentRoutes);
app.use('/api', clientRoutes);
app.use('/api', tokenRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/ai-prompt', aiPromptRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
// Initialize cron jobs
// cronJobs.initializeCronJobs();

// app.get('/api/protected-route', authenticateToken, (req, res) => {
//   res.json({ message: 'You have access to this protected route' });
// });

module.exports = app;
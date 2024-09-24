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

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("Uzi Barber App"));

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
// Initialize cron jobs
cronJobs.initializeCronJobs();

module.exports = app;
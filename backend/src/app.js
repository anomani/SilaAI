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

// Middleware
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

module.exports = app;
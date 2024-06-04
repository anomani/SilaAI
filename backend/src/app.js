require('dotenv').config();

const express = require('express');
const path = require('path');
const followupRoutes = require('./routes/followupRoutes');
const chatRoutes = require('./routes/chatRoutes');  // Import chat routes
const appointmentRoutes = require('./routes/appointmentRoutes');
const clientRoutes = require('./routes/clientRoutes');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/followup', followupRoutes);
app.use('/api/chat', chatRoutes);  
app.use('/api', appointmentRoutes);
app.use('/api', clientRoutes);
module.exports = app;
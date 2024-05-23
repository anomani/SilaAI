require('dotenv').config();

const express = require('express');
const path = require('path');
const followupRoutes = require('./routes/followupRoutes');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/followup', followupRoutes);

module.exports = app;
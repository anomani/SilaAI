require('dotenv').config();
console.log('Starting application...');
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

const app = require('./src/app');
const port = process.env.PORT || 3000;

console.log('PORT environment variable:', process.env.PORT);

// More detailed error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

app.get("/", (req, res) => res.send("Uzi Barber App"));

// Start server with error handling
console.log('Attempting to start server on port:', port);
const server = app.listen(port, '0.0.0.0', async () => {
    console.log(`Server successfully bound to port ${port}`);
    
    // Initialize cron jobs after server is running
    try {
        console.log('Initializing cron jobs...');
        await app.initializeCronJobs();
    } catch (error) {
        console.error('Failed to initialize cron jobs, but server will continue running:', error);
    }
}).on('error', (err) => {
    console.error('Failed to start server:', err);
    console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
    });
    process.exit(1);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;
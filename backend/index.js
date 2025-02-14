require('dotenv').config();

const app = require('./src/app');
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');

app.use(bodyParser.json());

// Basic health check endpoint
app.get("/", (req, res) => {
  console.log("Health check endpoint hit");
  res.send("Uzi Barber App");
});

// Export the app before starting the server
module.exports = app;

// Only start the server if this file is run directly
if (require.main === module) {
  console.log('Starting server initialization...');
  console.log(`Port being used: ${port}`);
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server successfully bound to port ${port}`);
    console.log(`Server is running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    console.error('Server failed to start:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });

  // Add timeout handling
  server.setTimeout(120000); // 2 minute timeout

  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}
require('dotenv').config();

const app = require('./src/app');
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.get("/", (req, res) => res.send("Uzi Barber App"));

// Export the app before starting the server
module.exports = app;

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${port}`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}
require('dotenv').config(); // Add this line at the very top

const app = require('./src/app');
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
app.get("/", (req, res) => res.send("Uzi Barber App"));

app.use(bodyParser.json());
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});


module.exports = app;
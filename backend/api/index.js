const app = require('../src/app');
const port = process.env.PORT || 3000;

const bodyParser = require('body-parser');
app.get("/", (req, res) => res.send("Express on Vercel"));

app.use(bodyParser.json());
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

module.exports = app;
const app = require('./src/app');
const port = process.env.PORT || 3000;
require('./src/config/cronJobs');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

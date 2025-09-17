// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// JSON parsing
app.use(bodyParser.json());

// Static “home” (optional landing)
app.use('/', express.static(path.join(__dirname, 'modules/custom-activity/html')));

// Mount the custom activity module
require('./modules/custom-activity/app/app')(app, {
  rootDirectory: __dirname
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`SFMC Custom Activity server listening on http://localhost:${PORT}`);
});

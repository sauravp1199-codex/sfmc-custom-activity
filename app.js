// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Respect X-Forwarded-* headers when running behind a proxy/load balancer
// so we can correctly determine the external protocol + host for config.json.
app.set('trust proxy', true);

// JSON parsing
app.use(bodyParser.json());

// Static “home” (optional landing)
app.use('/', express.static(path.join(__dirname, 'public')));

// Mount the custom activity module
require('./modules/custom-activity/app/app')(app, {
  rootDirectory: __dirname
});

const PORT = process.env.PORT || 1111;
app.listen(PORT, () => {
  console.log(`SFMC Custom Activity server listening on http://localhost:${PORT}`);
});

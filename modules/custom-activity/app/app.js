// modules/custom-activity/app/app.js
const express = require('express');
const path = require('path');
// const jwt = require('jsonwebtoken'); // if you plan to verify JB JWT

module.exports = function(app, options = {}) {
  const moduleDirectory = path.join(options.rootDirectory, 'modules', 'custom-activity');

  // Bundled assets (webpack output)
  app.use(
    '/modules/custom-activity/dist',
    express.static(path.join(moduleDirectory, 'dist'))
  );

  // Redirect base → UI
  app.get('/modules/custom-activity/', (req, res) =>
    res.redirect('/modules/custom-activity/index.html')
  );

  // UI (config iframe)
  app.get('/modules/custom-activity/index.html', (req, res) =>
    res.sendFile(path.join(moduleDirectory, 'html', 'index.html'))
  );

  // Dynamic config.json
  const configJSON = require('../config/config-json');
  app.get('/modules/custom-activity/config.json', (req, res) =>
    res.status(200).json(configJSON(req))
  );

  // Save (when user hits “Done” in inspector)
  app.post('/modules/custom-activity/save', (req, res) => {
    console.log('save payload:', JSON.stringify(req.body));
    return res.status(200).json({});
  });

  // Validate (pre-publish)
  app.post('/modules/custom-activity/validate', (req, res) => {
    console.log('validate payload:', JSON.stringify(req.body));
    // Add your validations; return 400 to block publish
    return res.status(200).json({});
  });

  // Publish (journey activated)
  app.post('/modules/custom-activity/publish', (req, res) => {
    console.log('publish payload:', JSON.stringify(req.body));
    return res.status(200).json({});
  });

  // Stop (journey stopped)
  app.post('/modules/custom-activity/stop', (req, res) => {
    console.log('stop payload:', JSON.stringify(req.body));
    return res.status(200).json({});
  });

  // Execute (runtime: contact reaches step)
  app.post('/modules/custom-activity/execute', async (req, res) => {
    try {
      // Optional: verify JWT (if you configure JB to send it)
      // const token = req.headers['authorization']?.split(' ')[1];
      // jwt.verify(token, process.env.JB_PUBLIC_KEY, { algorithms: ['RS256'] });

      const inArgs = (req.body?.inArguments || [])
        .reduce((acc, obj) => Object.assign(acc, obj), {});
      // Example inArguments (from UI or data bindings)
      const { discount = 10, email, mobile } = inArgs;

      // TODO: integrate your API
      // const apiResp = await axios.post(process.env.API_URL + '/issue-discount', { email, mobile, discount }, {
      //   headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
      //   timeout: 10000
      // });

      // Demo response
      const out = {
        discount: Number(discount),
        discountCode: generateCode() + `-${discount}%`,
        // issuedAt: apiResp.data.issuedAt,
      };

      console.log('execute out:', out);
      return res.status(200).json(out);
    } catch (err) {
      console.error('execute error:', err?.response?.status, err?.message);
      // Non-2xx ejects contact; choose carefully
      return res.status(500).json({ message: 'Temporary failure' });
    }
  });
};

function generateCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  while (s.length < len) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

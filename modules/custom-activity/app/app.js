// modules/custom-activity/app/app.js
const express = require('express');
const path = require('path');
const axios = require('axios');
// const jwt = require('jsonwebtoken'); // if you plan to verify JB JWT

const DEFAULT_PROD_API_URL = 'https://sfmc.comsensetechnologies.com/api/message';
const DEFAULT_DEV_API_URL = 'http://localhost:3000/api/message';

const {
  NODE_ENV,
  APP_ENV,
  API_URL: API_URL_OVERRIDE,
  API_URL_PROD,
  API_URL_DEV,
  API_TOKEN,
  API_BASIC_TOKEN = 'YWRtaW46UGFzc3cwcmQh',
  API_USERNAME,
  API_PASSWORD,
  API_TIMEOUT = '10000',
  MESSAGE_CHANNEL = 'WABA',
  MESSAGE_CONTENT_TYPE = 'AUTO_TEMPLATE',
  MESSAGE_PREVIEW_URL = 'false',
  MESSAGE_SENDER_NAME = 'whatsappdemo',
  MESSAGE_SENDER_FROM = '919999999999',
  MESSAGE_WEBHOOK_DNID = '1001',
  MESSAGE_METADATA_VERSION = 'v1.0.9',
} = process.env;

const environmentName = (APP_ENV || NODE_ENV || '').toLowerCase();
const isDevEnvironment = ['development', 'dev', 'local'].includes(environmentName);
const API_URL = API_URL_OVERRIDE
  || (isDevEnvironment
    ? (API_URL_DEV || DEFAULT_DEV_API_URL)
    : (API_URL_PROD || DEFAULT_PROD_API_URL));

const REQUEST_TIMEOUT = Number.isNaN(Number(API_TIMEOUT))
  ? 10000
  : Number(API_TIMEOUT);
const DEFAULT_PREVIEW_URL = coerceBoolean(MESSAGE_PREVIEW_URL, false);

module.exports = function(app, options = {}) {
  const publicDirectory = path.join(options.rootDirectory, 'public');

  app.use(
    '/modules/custom-activity',
    express.static(publicDirectory, { index: false })
  );

  // Redirect base → UI
  app.get('/modules/custom-activity/', (req, res) =>
    res.redirect('/modules/custom-activity/index.html')
  );

  // UI (config iframe)
  app.get('/modules/custom-activity/index.html', (req, res) =>
    res.sendFile(path.join(publicDirectory, 'index.html'))
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
    const inArgs = collectInArguments(req.body);
    const validation = validateInArguments(inArgs);
    if (!validation.valid) {
      console.error('validate error:', validation.message);
      return res.status(400).json({ message: validation.message });
    }

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

      const inArgs = collectInArguments(req.body);
      const validation = validateInArguments(inArgs);
      if (!validation.valid) {
        console.error('execute validation error:', validation.message);
        return res.status(400).json({ message: validation.message });
      }

      const payload = validation.payload;

      const headers = buildRequestHeaders();

      console.log('execute upstream request:', JSON.stringify(payload));

      const response = await axios.post(API_URL, payload, {
        headers,
        timeout: REQUEST_TIMEOUT,
      });

      const out = buildExecuteResponse(response, payload);

      console.log('execute upstream response:', out);
      return res.status(200).json(out);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('execute error:', status, err?.message, data ? JSON.stringify(data) : '');

      const message = data?.message || err?.message || 'Temporary failure';
      return res.status(500).json({ message });
    }
  });
};

function collectInArguments(payload = {}) {
  const candidate = Array.isArray(payload?.inArguments)
    ? payload.inArguments
    : Array.isArray(payload?.arguments?.execute?.inArguments)
      ? payload.arguments.execute.inArguments
      : [];

  return candidate.reduce((acc, obj) => Object.assign(acc, obj), {});
}

function validateInArguments(inArgs = {}) {
  const payload = buildMessagePayload(inArgs);

  if (!payload?.message?.content?.text) {
    return { valid: false, message: 'Message content text is required' };
  }

  if (!payload?.message?.recipient?.to) {
    return { valid: false, message: 'Recipient number is required' };
  }

  return { valid: true, payload };
}

function buildRequestHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_USERNAME && API_PASSWORD) {
    headers.Authorization = `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`;
  } else if (API_BASIC_TOKEN) {
    headers.Authorization = `Basic ${API_BASIC_TOKEN}`;
  } else if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  return headers;
}

function buildExecuteResponse(response, payload) {
  const upstream = response?.data;
  const messageId = upstream?.messageId
    || upstream?.id
    || upstream?.message?.id
    || upstream?.message?.messageId
    || null;

  const reference = payload?.message?.recipient?.reference;
  const preferences = payload?.message?.preferences;

  return pruneNullish({
    upstreamStatus: response?.status,
    messageId,
    channel: payload?.message?.channel,
    recipient: payload?.message?.recipient?.to,
    campaignName: reference?.campaignName || reference?.cust_ref,
    sendType: preferences?.sendType,
    sendSchedule: preferences?.sendSchedule,
    upstreamResponse: upstream,
  });
}

function buildMessagePayload(inArgs = {}) {
  const previewUrl = coerceBoolean(
    firstNonNullish([inArgs.previewUrl, inArgs.contentPreviewUrl]),
    DEFAULT_PREVIEW_URL
  );

  const campaignName = firstNonNullish([inArgs.campaignName, inArgs.campaign, inArgs.activityName]);
  const messageTemplate = firstNonNullish([inArgs.messageTemplate, inArgs.templateName]);
  const sendType = firstNonNullish([inArgs.sendType, 'immediate']);
  const sendSchedule = sendType === 'schedule'
    ? firstNonNullish([inArgs.sendSchedule, inArgs.scheduledAt])
    : undefined;

  const content = {
    preview_url: previewUrl,
    text: firstNonNullish([inArgs.messageText, inArgs.messageBody, inArgs.contentText]),
    type: firstNonNullish([inArgs.contentType, MESSAGE_CONTENT_TYPE]),
    template: messageTemplate ? { name: messageTemplate } : undefined,
    media: buildMedia(inArgs.mediaUrl, inArgs.mediaType),
    buttons: buildButtons(inArgs.buttonLabel),
  };

  const payload = {
    message: {
      channel: firstNonNullish([inArgs.channel, MESSAGE_CHANNEL]),
      content,
      recipient: {
        to: firstNonNullish([inArgs.recipientTo, inArgs.mobile, inArgs.to]),
        recipient_type: firstNonNullish([inArgs.recipientType, 'individual']),
        reference: {
          cust_ref: firstNonNullish([inArgs.customerReference, inArgs.custRef, campaignName]),
          messageTag1: firstNonNullish([inArgs.messageTag1, inArgs.messageTag, campaignName, messageTemplate]),
          conversationId: firstNonNullish([inArgs.conversationId, inArgs.journeyConversationId]),
          campaignName,
          templateName: messageTemplate,
        },
      },
      sender: {
        name: firstNonNullish([inArgs.senderName, MESSAGE_SENDER_NAME]),
        from: firstNonNullish([inArgs.senderFrom, MESSAGE_SENDER_FROM]),
      },
      preferences: {
        webHookDNId: firstNonNullish([inArgs.webHookDNId, MESSAGE_WEBHOOK_DNID]),
        sendType,
        sendSchedule,
      },
    },
    metaData: {
      version: firstNonNullish([inArgs.metadataVersion, inArgs.metaVersion, MESSAGE_METADATA_VERSION]),
      campaign: {
        name: campaignName,
        template: messageTemplate,
        mediaUrl: inArgs.mediaUrl,
        buttonLabel: inArgs.buttonLabel,
        sendType,
        sendSchedule,
      },
    },
  };

  return pruneNullish(payload);
}

function buildMedia(url, explicitType) {
  const mediaUrl = firstNonNullish([url]);
  if (!mediaUrl) return undefined;

  const type = explicitType || inferMediaType(mediaUrl);
  return pruneNullish({
    type,
    url: mediaUrl,
  });
}

function buildButtons(label) {
  const quickReplyLabel = firstNonNullish([label]);
  if (!quickReplyLabel) return undefined;

  return [
    {
      type: 'QUICK_REPLY',
      label: quickReplyLabel,
    },
  ];
}

function inferMediaType(url) {
  if (!url || typeof url !== 'string') return undefined;

  const normalized = url.toLowerCase();
  if (normalized.match(/\.(mp4|mov|m4v|avi|wmv|webm)(\?|$)/)) return 'video';
  if (normalized.match(/\.(mp3|wav|m4a|aac|ogg)(\?|$)/)) return 'audio';
  return 'image';
}

function coerceBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return Boolean(value);
}

function firstNonNullish(values = []) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function pruneNullish(value) {
  if (Array.isArray(value)) {
    const result = value
      .map((item) => pruneNullish(item))
      .filter((item) => item !== undefined);
    return result.length > 0 ? result : undefined;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, val]) => [key, pruneNullish(val)])
      .filter(([, val]) => val !== undefined);

    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries);
  }

  if (value === undefined || value === null || value === '') return undefined;

  return value;
}

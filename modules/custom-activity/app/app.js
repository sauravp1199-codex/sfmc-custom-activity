// modules/custom-activity/app/app.js
const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const {
  applyCrossOriginResourcePolicyHeader,
  withCrossOriginResourcePolicy,
} = require('../../../lib/cross-origin-resource-policy');
// const jwt = require('jsonwebtoken'); // if you plan to verify JB JWT

const DEFAULT_ACTIVITY_PATH = '/modules/custom-activity';
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
  const mountPath = normaliseMountPath(options.mountPath) || DEFAULT_ACTIVITY_PATH;
  const route = (segment) => joinMountPath(mountPath, segment);

  if (mountPath !== '/') {
    app.use(
      mountPath,
      express.static(publicDirectory, {
        index: false,
        setHeaders: applyCrossOriginResourcePolicyHeader,
      })
    );

    const baseRoute = route('');
    const baseRouteWithSlash = `${baseRoute}/`;
    const indexRoute = route('index.html');

    app.get([baseRoute, baseRouteWithSlash], (req, res) => {
      withCrossOriginResourcePolicy(res);
      res.redirect(indexRoute);
    });
  }

  // UI (config iframe)
  app.get(route('index.html'), (req, res) => {
    withCrossOriginResourcePolicy(res);
    res.sendFile(path.join(publicDirectory, 'index.html'));
  });

  // Dynamic config.json
  const configJSON = require('../config/config-json');
  const sendConfigJSON = (req, res) => {
    withCrossOriginResourcePolicy(res);
    return res.status(200).json(configJSON(req));
  };

  app.get(route('config.json'), sendConfigJSON);
  app.get('/config.json', sendConfigJSON);

  // Save (when user hits “Done” in inspector)
  app.post(route('save'), (req, res) => {
    console.log('save payload:', JSON.stringify(req.body));
    withCrossOriginResourcePolicy(res);
    return res.status(200).json({ success: true });
  });

  // Validate (pre-publish)
  app.post(route('validate'), (req, res) => {
    console.log('validate payload:', JSON.stringify(req.body));
    const inArgs = collectInArguments(req.body);
    const validation = validateInArguments(inArgs);
    if (!validation.valid) {
      console.error('validate error:', validation.message);
      withCrossOriginResourcePolicy(res);
      return res.status(200).json({
        success: false,
        validationErrors: [validation.message],
      });
    }

    withCrossOriginResourcePolicy(res);
    return res.status(200).json({ success: true, validationErrors: [] });
  });

  // Publish (journey activated)
  app.post(route('publish'), (req, res) => {
    console.log('publish payload:', JSON.stringify(req.body));
    withCrossOriginResourcePolicy(res);
    return res.status(200).json({ success: true });
  });

  // Unpublish (journey deactivated before stop)
  app.post(route('unpublish'), (req, res) => {
    console.log('unpublish payload:', JSON.stringify(req.body));
    withCrossOriginResourcePolicy(res);
    return res.status(200).json({ success: true });
  });

  // Stop (journey stopped)
  app.post(route('stop'), (req, res) => {
    console.log('stop payload:', JSON.stringify(req.body));
    withCrossOriginResourcePolicy(res);
    return res.status(200).json({ success: true });
  });

  // Execute (runtime: contact reaches step)
  app.post(route('execute'), async (req, res) => {
    try {
      // Optional: verify JWT (if you configure JB to send it)
      // const token = req.headers['authorization']?.split(' ')[1];
      // jwt.verify(token, process.env.JB_PUBLIC_KEY, { algorithms: ['RS256'] });

      const inArgs = collectInArguments(req.body);
      const validation = validateInArguments(inArgs);
      if (!validation.valid) {
        console.error('execute validation error:', validation.message);
        withCrossOriginResourcePolicy(res);
        return res.status(400).json({ message: validation.message });
      }

      const payload = validation.payload;

      const headers = buildRequestHeaders();

      console.log('execute upstream request:', JSON.stringify(payload));

      const response = await axios.post(API_URL, payload, {
        headers,
        timeout: REQUEST_TIMEOUT,
      });

      // Validate and format the API response
      const responseData = response.data;
      
      // Build a standardized success response
      const out = {
        success: true,
        messageId: responseData.messageId || responseData.id,
        channel: payload?.message?.channel || MESSAGE_CHANNEL,
        recipient: payload?.message?.recipient?.to,
        timestamp: new Date().toISOString(),
        upstreamStatus: response.status,
        upstreamResponse: responseData,
        metadata: {
          journeyId: req.body.journeyId,
          activityId: req.body.activityId,
          contactKey: req.body.keyValue,
          definitionInstanceId: req.body.definitionInstanceId
        }
      };

      console.log('execute upstream response:', out);
      withCrossOriginResourcePolicy(res);
      return res.status(200).json(out);
    } catch (err) {
      const status = err?.response?.status || 500;
      const data = err?.response?.data;
      const message = data?.message || err.message || 'An unexpected error occurred';
      const code = data?.code || 'UNKNOWN_ERROR';

      console.error('execute error:', {
        status,
        message,
        code,
        data
      });

      withCrossOriginResourcePolicy(res);
      return res.status(status).json({
        success: false,
        error: {
          status,
          message,
          code
        }
      });
    }
  });

  // Lightweight mock for the downstream messaging API so the
  // Journey Builder activity can be exercised end-to-end without the
  // real upstream integration.
  app.post('/api/message', (req, res) => {
    const authError = ensureInboundAuthorization(req?.headers?.authorization);
    if (authError) {
      console.error('api/message auth error:', authError.message);
      withCrossOriginResourcePolicy(res);
      return res.status(authError.status).json({ message: authError.message });
    }

    const validation = validateInboundMessage(req?.body);
    if (!validation.valid) {
      console.error('api/message validation error:', validation.message);
      withCrossOriginResourcePolicy(res);
      return res.status(400).json({ message: validation.message });
    }

    const payload = validation.payload;
    console.log('api/message payload:', JSON.stringify(payload));

    const responseBody = buildMockMessageResponse(payload);
    withCrossOriginResourcePolicy(res);
    return res.status(202).json(responseBody);
  });
};

function collectInArguments(payload = {}) {
  const candidateArrays = [];

  const pushIfArray = (value) => {
    if (Array.isArray(value) && value.length > 0) {
      candidateArrays.push(value);
    }
  };

  const addActivity = (activity) => {
    pushIfArray(activity?.arguments?.execute?.inArguments);
  };

  pushIfArray(payload?.inArguments);
  pushIfArray(payload?.arguments?.execute?.inArguments);
  addActivity(payload?.activity);
  addActivity(payload?.activityConfig);

  if (Array.isArray(payload?.activities)) {
    payload.activities.forEach(addActivity);
  }

  if (candidateArrays.length === 0) {
    return {};
  }

  return candidateArrays
    .flat()
    .filter((item) => item && typeof item === 'object')
    .reduce((acc, obj) => Object.assign(acc, obj), {});
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

function ensureInboundAuthorization(authorizationHeader) {
  const expectedBearer = API_TOKEN && API_TOKEN.trim();
  const expectedBasic = resolveBasicToken();

  if (!expectedBearer && !expectedBasic) {
    return null;
  }

  if (!authorizationHeader) {
    return { status: 401, message: 'Missing Authorization header' };
  }

  const header = authorizationHeader.trim();
  if (header.toLowerCase().startsWith('bearer ')) {
    if (expectedBearer && header.slice(7).trim() === expectedBearer) {
      return null;
    }
    return { status: 401, message: 'Invalid bearer token' };
  }

  if (header.toLowerCase().startsWith('basic ')) {
    const token = header.slice(6).trim();
    if (expectedBasic && token === expectedBasic) {
      return null;
    }
    return { status: 401, message: 'Invalid basic credentials' };
  }

  return { status: 401, message: 'Unsupported authorization scheme' };
}

function resolveBasicToken() {
  if (API_BASIC_TOKEN) return API_BASIC_TOKEN;
  if (API_USERNAME && API_PASSWORD) {
    return Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
  }
  return null;
}

function validateInboundMessage(body = {}) {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: 'Request body must be a JSON object' };
  }

  const message = body.message;
  if (!message || typeof message !== 'object') {
    return { valid: false, message: 'message object is required' };
  }

  const content = message.content;
  if (!content || typeof content !== 'object') {
    return { valid: false, message: 'message.content is required' };
  }

  if (!content.text) {
    return { valid: false, message: 'message.content.text is required' };
  }

  const recipient = message.recipient;
  if (!recipient || typeof recipient !== 'object' || !recipient.to) {
    return { valid: false, message: 'message.recipient.to is required' };
  }

  const sender = message.sender;
  if (!sender || typeof sender !== 'object' || !sender.from) {
    return { valid: false, message: 'message.sender.from is required' };
  }

  const sanitized = pruneNullish(body);
  return { valid: true, payload: sanitized };
}

function buildMockMessageResponse(payload) {
  const messageId = generateMessageId();
  const acceptedAt = new Date().toISOString();

  return pruneNullish({
    messageId,
    status: 'accepted',
    acceptedAt,
    message: {
      channel: payload?.message?.channel,
      recipient: payload?.message?.recipient?.to,
    },
    metaData: payload?.metaData,
  });
}

function generateMessageId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function normaliseMountPath(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return null;
  }

  const trimmed = pathname.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined') {
    return null;
  }

  if (trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function joinMountPath(base, segment = '') {
  const normalisedBase = base === '/' ? '' : base?.replace?.(/\/+$/, '') || '';
  const normalisedSegment = segment
    ? String(segment).replace(/^\/+/, '')
    : '';

  if (!normalisedBase && !normalisedSegment) {
    return '/';
  }

  if (!normalisedSegment) {
    return normalisedBase || '/';
  }

  return normalisedBase
    ? `${normalisedBase}/${normalisedSegment}`
    : `/${normalisedSegment}`;
}

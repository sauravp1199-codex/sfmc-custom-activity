// modules/custom-activity/config/config-json.js
const DEFAULT_ACTIVITY_PATH = '/modules/custom-activity';

const envPublicUrl = process.env.ACTIVITY_PUBLIC_URL ?? process.env.PUBLIC_URL;
const envConfig = parsePublicUrl(envPublicUrl);
const envActivityExtensionKey =
  process.env.ACTIVITY_EXTENSION_KEY ??
  process.env.ACTIVITY_PACKAGE_ID ??
  process.env.ACTIVITY_PACKAGE_KEY ??
  null;
const envContactAttributeKey =
  process.env.ACTIVITY_CONTACT_DE_KEY ??
  process.env.DATA_EXTENSION_KEY ??
  '170E7DC6-4174-40F9-8166-8681DD916F9B';
const ENV_ORIGIN = envConfig?.origin;
const ENV_PATH = envConfig?.path;

module.exports = function configJSON(req) {
  const origin = resolveOrigin(req);
  const activityPath = resolveActivityPath(req);

  return {
    key: envActivityExtensionKey,
    workflowApiVersion: '1.1',
    type: 'REST',
    metaData: {
      icon: toAbsoluteUrl(origin, activityPath, 'images/icon.svg'),
      category: 'customer'
    },
    lang: {
      'en-US': {
        name: 'WhatsApp Message Activity',
        description: 'Trigger personalised WhatsApp journeys with media and quick replies.'
      }
    },
    arguments: {
      execute: {
        inArguments: [
          {
            channel: 'WABA'
          },
          {
            campaignName: 'Adidas India – Welcome Offer'
          },
          {
            senderName: 'Adidas India'
          },
          {
            messageTemplate: 'promo'
          },
          {
            messageBody: `Hey ${resolveContactAttribute(
              'FirstName'
            )}, surprise! Enjoy 60% off on your next purchase with code WELCOME60.`
          },
          {
            mediaUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b'
          },
          {
            buttonLabel: 'Shop Now'
          },
          {
            sendType: 'immediate'
          },
          {
            recipientTo: resolveContactAttribute('Mobile')
          },
          {
            senderFrom: '919999999999'
          },
          {
            metadataVersion: 'v1.0.9'
          }
        ],
        outArguments: [],
        url: toAbsoluteUrl(origin, activityPath, 'execute'),
        timeout: 10000,
        retryCount: 3,
        retryDelay: 1000
      }
    },
    configurationArguments: {
      applicationExtensionKey: envActivityExtensionKey,
      save: { url: toAbsoluteUrl(origin, activityPath, 'save') },
      publish: { url: toAbsoluteUrl(origin, activityPath, 'publish') },
      validate: { url: toAbsoluteUrl(origin, activityPath, 'validate') },
      stop: { url: toAbsoluteUrl(origin, activityPath, 'stop') }
    },
    userInterfaces: {
      configInspector: {
        url: toAbsoluteUrl(origin, activityPath, 'index.html'),
        size: 'scm-lg' // inspector size
      }
    },
    schema: {
      arguments: {
        execute: {
          inArguments: [
            { channel: { dataType: 'Text', direction: 'in' } },
            { campaignName: { dataType: 'Text', direction: 'in' } },
            { senderName: { dataType: 'Text', direction: 'in' } },
            { messageTemplate: { dataType: 'Text', direction: 'in' } },
            { messageBody: { dataType: 'Text', direction: 'in' } },
            { mediaUrl: { dataType: 'Text', direction: 'in' } },
            { buttonLabel: { dataType: 'Text', direction: 'in' } },
            { sendType: { dataType: 'Text', direction: 'in' } },
            { sendSchedule: { dataType: 'Text', direction: 'in' } },
            { contentType: { dataType: 'Text', direction: 'in' } },
            { previewUrl: { dataType: 'Boolean', direction: 'in' } },
            { recipientTo: { dataType: 'Text', direction: 'in' } },
            { recipientType: { dataType: 'Text', direction: 'in' } },
            { customerReference: { dataType: 'Text', direction: 'in' } },
            { messageTag1: { dataType: 'Text', direction: 'in' } },
            { conversationId: { dataType: 'Text', direction: 'in' } },
            { senderFrom: { dataType: 'Text', direction: 'in' } },
            { webHookDNId: { dataType: 'Text', direction: 'in' } },
            { metadataVersion: { dataType: 'Text', direction: 'in' } }
          ],
          outArguments: [
            { upstreamStatus: { dataType: 'Number', direction: 'out', access: 'visible' } },
            { messageId: { dataType: 'Text', direction: 'out', access: 'visible' } }
          ]
        }
      }
    }
  };
};

function resolveOrigin(req = {}) {
  if (ENV_ORIGIN) {
    return ENV_ORIGIN;
  }

  const forwardedProto = resolveForwardedProto(req.headers?.['x-forwarded-proto']);
  const forwardedHost = firstHeaderValue(req.headers?.['x-forwarded-host']);

  const host = forwardedHost || req.get?.('host') || req.headers?.host || '';
  const protocol = resolveProtocol({
    forwardedProto,
    requestProtocol: req.protocol,
    host,
  });

  return {
    protocol,
    host
  };
}

function resolveActivityPath(req = {}) {
  if (ENV_PATH) {
    return ENV_PATH;
  }

  const rawPath = (req.originalUrl || req.url || '')
    .split('?')[0]
    .replace(/\/config\.json$/i, '');

  const fromRequest = normalisePath(rawPath);
  if (fromRequest) {
    return fromRequest;
  }

  const fromEnv = normalisePath(process.env.ACTIVITY_MOUNT_PATH);
  if (fromEnv) {
    return fromEnv;
  }

  return DEFAULT_ACTIVITY_PATH;
}

function resolveContactAttribute(field) {
  return `{{Contact.Attribute.${envContactAttributeKey}.${field}}}`;
}

function normalisePath(pathname) {
  if (!pathname || pathname === '/') {
    return '';
  }

  const trimmed = pathname.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  if (!withoutTrailingSlash) {
    return '';
  }

  return withoutTrailingSlash.startsWith('/')
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`;
}

function toAbsoluteUrl(origin = {}, ...segments) {
  const normalisedSegments = segments
    .filter((segment) => segment !== undefined && segment !== null && segment !== '')
    .map((segment) => String(segment))
    .map((segment) => segment.replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter((segment) => segment.length > 0);

  if (!origin.host) {
    return `/${normalisedSegments.join('/')}`;
  }

  const protocol = resolveExternalProtocol(origin.protocol, origin.host)
    || (isLocalHost(origin.host) ? 'http' : 'https');
  const base = new URL(`${protocol}://${origin.host}`);
  base.pathname = normalisedSegments.length ? `/${normalisedSegments.join('/')}` : '/';

  const serialised = base.toString();
  return normalisedSegments.length ? serialised.replace(/\/$/, '') : serialised;
}

function parsePublicUrl(candidate) {
  if (!candidate || typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!url.hostname) {
      return null;
    }

    return {
      origin: {
        protocol: resolveExternalProtocol(url.protocol, url.host)
          || (isLocalHost(url.host) ? 'http' : 'https'),
        host: url.host,
      },
      path: normalisePath(url.pathname),
    };
  } catch (err) {
    return null;
  }
}

function resolveProtocol({ forwardedProto, requestProtocol, host }) {
  const candidates = [forwardedProto, requestProtocol];
  for (const candidate of candidates) {
    const resolved = resolveExternalProtocol(candidate, host);
    if (resolved) {
      return resolved;
    }
  }

  return isLocalHost(host) ? 'http' : 'https';
}

function resolveExternalProtocol(candidate, host) {
  const normalised = normaliseProtocol(candidate);
  if (!normalised) {
    return null;
  }

  if (normalised === 'https') {
    return 'https';
  }

  if (normalised === 'http') {
    return isLocalHost(host) ? 'http' : 'https';
  }

  return null;
}

function normaliseProtocol(candidate) {
  if (!candidate) {
    return null;
  }

  const trimmed = String(candidate).trim().toLowerCase().replace(/:$/, '');
  if (!trimmed) {
    return null;
  }

  if (trimmed === 'http' || trimmed === 'https') {
    return trimmed;
  }

  return null;
}

function firstHeaderValue(value) {
  if (!value) {
    return '';
  }

  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  if (typeof value !== 'string') {
    return '';
  }

  return value.split(',')[0].trim();
}

function resolveForwardedProto(value) {
  if (!value) {
    return '';
  }

  const tokens = [];
  const appendTokens = (item) => {
    if (item === undefined || item === null) {
      return;
    }

    String(item)
      .split(',')
      .forEach((token) => tokens.push(token.trim()));
  };

  if (Array.isArray(value)) {
    value.forEach(appendTokens);
  } else {
    appendTokens(value);
  }

  const filtered = tokens.filter(Boolean);
  if (filtered.length === 0) {
    return '';
  }

  for (const token of filtered) {
    if (normaliseProtocol(token) === 'https') {
      return 'https';
    }
  }

  for (const token of filtered) {
    const normalised = normaliseProtocol(token);
    if (normalised) {
      return normalised;
    }
  }

  return '';
}

function isLocalHost(host) {
  if (!host) {
    return false;
  }

  const hostValue = String(host).trim();
  if (!hostValue) {
    return false;
  }

  let hostname = hostValue;

  if (hostname.startsWith('[')) {
    const closingIndex = hostname.indexOf(']');
    hostname = closingIndex >= 0 ? hostname.slice(1, closingIndex) : hostname.slice(1);
  }

  if (hostname.includes(':') && !hostname.includes('.')) {
    // IPv6 without explicit port handled above; leave as-is for ::1 check
  } else if (hostname.includes(':')) {
    hostname = hostname.split(':')[0];
  }

  hostname = hostname.trim().toLowerCase();
  if (!hostname) {
    return false;
  }

  if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    return true;
  }

  if (hostname.endsWith('.local')) {
    return true;
  }

  if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
    return true;
  }

  if (hostname.startsWith('172.')) {
    const secondOctet = Number(hostname.split('.')[1]);
    if (!Number.isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  if (hostname.startsWith('127.')) {
    return true;
  }

  return false;
}

// modules/custom-activity/config/config-json.js
const DEFAULT_ACTIVITY_PATH = '/modules/custom-activity';

const envPublicUrl = process.env.ACTIVITY_PUBLIC_URL || process.env.PUBLIC_URL;
const envConfig = parsePublicUrl(envPublicUrl);
const ENV_ORIGIN = envConfig?.origin;
const ENV_PATH = envConfig?.path;

module.exports = function configJSON(req) {
  const origin = resolveOrigin(req);
  const activityPath = resolveActivityPath(req);

  return {
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
            messageBody: 'Hey {{Contact.Attribute.DE.FirstName}}, surprise! Enjoy 60% off on your next purchase with code WELCOME60.'
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
            recipientTo: '{{Contact.Attribute.DE.Mobile}}'
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

  const forwardedProto = (req.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const forwardedHost = (req.headers?.['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();

  const protocol = forwardedProto || req.protocol || 'https';
  const host = forwardedHost || req.get?.('host') || req.headers?.host || '';

  return {
    protocol: protocol.replace(/:$/, '') || 'https',
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

  const base = new URL(`${origin.protocol || 'https'}://${origin.host}`);
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
        protocol: url.protocol.replace(/:$/, '') || 'https',
        host: url.host,
      },
      path: normalisePath(url.pathname),
    };
  } catch (err) {
    return null;
  }
}

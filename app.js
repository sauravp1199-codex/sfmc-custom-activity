require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const {
  applyCrossOriginResourcePolicyHeader,
} = require('./lib/cross-origin-resource-policy');

const DEFAULT_ACTIVITY_PATH = '/modules/custom-activity';

const app = express();

app.set('trust proxy', true);

app.use(bodyParser.json());

app.use('/', express.static(path.join(__dirname, 'public'), {
  setHeaders: applyCrossOriginResourcePolicyHeader,
}));

const activityMountPath = resolveActivityMountPath();

require('./modules/custom-activity/app/app')(app, {
  rootDirectory: __dirname,
  mountPath: activityMountPath
});

const PORT = process.env.PORT || 1111;
app.listen(PORT, () => {
  console.log(`SFMC Custom Activity server listening on http://localhost:${PORT}`);
});

function resolveActivityMountPath() {
  const explicitPath = normaliseMountPath(process.env.ACTIVITY_MOUNT_PATH);
  if (explicitPath) {
    return explicitPath;
  }

  const fromPublicUrl = parsePathFromUrl(process.env.ACTIVITY_PUBLIC_URL || process.env.PUBLIC_URL);
  if (fromPublicUrl) {
    return fromPublicUrl;
  }

  return DEFAULT_ACTIVITY_PATH;
}

function parsePathFromUrl(candidate) {
  if (!candidate || typeof candidate !== 'string') {
    return null;
  }

  try {
    const url = new URL(candidate.trim());
    return normaliseMountPath(url.pathname);
  } catch (err) {
    return null;
  }
}

function normaliseMountPath(pathname) {
  if (!pathname || typeof pathname !== 'string') {
    return null;
  }

  const trimmed = pathname.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

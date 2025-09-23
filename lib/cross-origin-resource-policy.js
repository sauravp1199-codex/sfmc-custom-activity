function applyCrossOriginResourcePolicyHeader(res, resourcePath) {
  if (!res || typeof res.setHeader !== 'function') {
    return;
  }

  const value = isSvgResource(resourcePath) ? 'cross-origin' : 'same-site';
  res.setHeader('Cross-Origin-Resource-Policy', value);
}

function withCrossOriginResourcePolicy(res, headerValue = 'same-site') {
  if (!res || typeof res.setHeader !== 'function') {
    return res;
  }

  res.setHeader('Cross-Origin-Resource-Policy', headerValue);
  return res;
}

function isSvgResource(resourcePath) {
  if (!resourcePath || typeof resourcePath !== 'string') {
    return false;
  }

  return resourcePath.trim().toLowerCase().endsWith('.svg');
}

module.exports = {
  applyCrossOriginResourcePolicyHeader,
  withCrossOriginResourcePolicy,
};

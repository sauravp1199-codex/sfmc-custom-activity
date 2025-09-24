const CROSS_ORIGIN_VALUE = 'cross-origin';

function applyCrossOriginResourcePolicyHeader(res) {
  if (!res || typeof res.setHeader !== 'function') {
    return;
  }

  res.setHeader('Cross-Origin-Resource-Policy', CROSS_ORIGIN_VALUE);
}

function withCrossOriginResourcePolicy(res, headerValue = CROSS_ORIGIN_VALUE) {
  if (!res || typeof res.setHeader !== 'function') {
    return res;
  }

  res.setHeader('Cross-Origin-Resource-Policy', headerValue);
  return res;
}

module.exports = {
  applyCrossOriginResourcePolicyHeader,
  withCrossOriginResourcePolicy,
};

const fs = require('fs');

const Redis = require('ioredis');

const env = process.env.NODE_ENV || 'development';

let rateLimit = {
  duration: process.env.RATELIMIT_DURATION
    ? parseInt(process.env.RATELIMIT_DURATION, 10)
    : 60000,
  max: process.env.RATELIMIT_MAX
    ? parseInt(process.env.RATELIMIT_MAX, 10)
    : 100,
  id: ctx => ctx.ip,
  prefix: process.env.RATELIMIT_PREFIX
    ? process.env.RATELIMIT_PREFIX
    : `limit_${env.toLowerCase()}`
};

if (env === 'development') rateLimit = false;

const redisClient = new Redis({
  showFriendlyErrorStack: env === 'development'
});

function sharedConfig(prefix) {
  prefix = prefix.toUpperCase();
  const config = {
    cabin: { capture: false },
    protocol: process.env[`${prefix}_PROTOCOL`] || 'http',
    ssl: {
      key: process.env[`${prefix}_SSL_KEY_PATH`]
        ? fs.readFileSync(process.env[`${prefix}_SSL_KEY_PATH`])
        : null,
      cert: process.env[`${prefix}_SSL_CERT_PATH`]
        ? fs.readFileSync(process.env[`${prefix}_SSL_CERT_PATH`])
        : null,
      ca: process.env[`${prefix}_SSL_CA_PATH`]
        ? fs.readFileSync(process.env[`${prefix}_SSL_CA_PATH`])
        : null
    },
    routes: false,
    logger: console,
    passport: false,
    i18n: {},
    rateLimit,
    // <https://github.com/koajs/cors#corsoptions>
    cors: {},
    // <https://github.com/ladjs/timeout>
    timeout: {
      ms: process.env[`${prefix}_TIMEOUT_MS`]
        ? parseInt(process.env[`${prefix}_TIMEOUT_MS`], 10)
        : 2000,
      message: ctx =>
        ctx.request.t(
          'Your request has timed out and we have been alerted of this issue. Please try again or contact us.'
        )
    },
    auth: false,
    // these are hooks that can get run before/after configuration
    // and must be functions that accept one argument `app`
    hookBeforeSetup: false,
    hookBeforeRoutes: false,
    // <https://github.com/luin/ioredis>
    // this is used for rate limiting and session storage (e.g. passport)
    // we support ioredis which allows clustering, sentinels, etc
    redisClient,
    // <https://github.com/ladjs/store-ip-address>
    storeIPAddress: {}
  };
  return config;
}

module.exports = sharedConfig;

const fs = require('fs');

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

function sharedConfig(prefix) {
  prefix = prefix.toUpperCase();
  const config = {
    cabin: { axe: { capture: false } },
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
    timeoutMs: process.env[`${prefix}_TIMEOUT_MS`]
      ? parseInt(process.env[`${prefix}_TIMEOUT_MS`], 10)
      : 2000,
    auth: false,
    // these are hooks that can get run before/after configuration
    // and must be functions that accept one argument `app`
    hookBeforeSetup: false,
    hookBeforeRoutes: false
  };
  return config;
}

module.exports = sharedConfig;

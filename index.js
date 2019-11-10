const fs = require('fs');

const boolean = require('boolean');

const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';

const rateLimit = isDev
  ? false
  : {
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

function sharedConfig(prefix) {
  prefix = prefix.toUpperCase();
  const config = {
    port: process.env[`${prefix}_PORT`] || null,
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
        : null,
      allowHTTP1: true
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
    // <https://github.com/ladjs/store-ip-address>
    storeIPAddress: {},
    // ioredis configuration object
    // <https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options>
    redis: {
      port: process.env[`${prefix}_REDIS_PORT`]
        ? parseInt(process.env[`${prefix}_REDIS_PORT`], 10)
        : 6379,
      host: process.env[`${prefix}_REDIS_HOST`]
        ? process.env[`${prefix}_REDIS_HOST`]
        : 'localhost',
      password: process.env[`${prefix}_REDIS_PASSWORD`]
        ? process.env[`${prefix}_REDIS_PASSWORD`]
        : null,
      showFriendlyErrorStack: boolean(
        process.env[`${prefix}_REDIS_SHOW_FRIENDLY_ERROR_STACK`]
      )
    },
    redisMonitor: boolean(process.env[`${prefix}_REDIS_MONITOR`]),
    // mongoose/mongo configuration object (passed to @ladjs/mongoose)
    mongoose: {
      debug: boolean(process.env[`${prefix}_MONGOOSE_DEBUG`]),
      mongo: {
        uri: process.env[`${prefix}_MONGO_URI`],
        options: {
          reconnectTries: process.env[`${prefix}_MONGO_RECONNECT_TRIES`]
            ? parseInt(process.env[`${prefix}_MONGO_RECONNECT_TRIES`], 10)
            : Number.MAX_VALUE,
          reconnectInterval: process.env[`${prefix}_MONGO_RECONNECT_INTERVAL`]
            ? parseInt(process.env[`${prefix}_MONGO_RECONNECT_INTERVAL`], 10)
            : 1000,
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      }
    }
  };
  return config;
}

module.exports = sharedConfig;

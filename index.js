const fs = require('fs');

const isSANB = require('is-string-and-not-blank');
const { boolean } = require('boolean');

const env = process.env.NODE_ENV || 'development';

function sharedConfig(prefix) {
  prefix = prefix.toUpperCase();
  let ssl = false;

  const keys = ['KEY', 'CERT', 'CA'];
  const validKeys = keys.filter(key =>
    isSANB(process.env[`${prefix}_SSL_${key}_PATH`])
  );
  if (validKeys.length > 0) {
    ssl = { allowHTTP1: true };
    validKeys.forEach(key => {
      ssl[key.toLowerCase()] = fs.readFileSync(
        process.env[`${prefix}_SSL_${key}_PATH`]
      );
    });
  }

  const config = {
    port: process.env[`${prefix}_PORT`] || null,
    cabin: { capture: false },
    protocol: process.env[`${prefix}_PROTOCOL`] || 'http',
    ...(ssl ? { ssl } : {}),
    routes: false,
    logger: console,
    passport: false,
    i18n: {},
    rateLimit:
      env === 'development'
        ? false
        : {
            duration: process.env[`${prefix}_RATELIMIT_DURATION`]
              ? parseInt(process.env[`${prefix}_RATELIMIT_DURATION`], 10)
              : 60000,
            max: process.env[`${prefix}_RATELIMIT_MAX`]
              ? parseInt(process.env[`${prefix}_RATELIMIT_MAX`], 10)
              : 100,
            id: ctx => ctx.ip,
            prefix: process.env[`${prefix}_RATELIMIT_PREFIX`]
              ? process.env[`${prefix}_RATELIMIT_PREFIX`]
              : `${prefix}_limit_${env}`.toLowerCase(),
            // whitelist/blacklist parsing inspired by `dotenv-parse-variables`
            whitelist: process.env[`${prefix}_RATELIMIT_WHITELIST`]
              ? process.env[`${prefix}_RATELIMIT_WHITELIST`]
                  .split(',')
                  .filter(str => str !== '')
              : [],
            blacklist: process.env[`${prefix}_RATELIMIT_BLACKLIST`]
              ? process.env[`${prefix}_RATELIMIT_BLACKLIST`]
                  .split(',')
                  .filter(str => str !== '')
              : []
          },
    // <https://github.com/koajs/cors#corsoptions>
    cors: {},
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: [
            'ws://localhost:35729',
            'http://localhost:3000',
            'http://localhost:4000',
            'data:',
            'http://*.cloudfront.net',
            'https://*.cloudfront.net'
          ],
          fontSrc: [
            "'self'",
            'data:',
            'http://fonts.gstatic.com',
            'http://cdn.jsdelivr.net'
          ],
          imgSrc: [
            "'self'",
            'data:',
            'http://*.cloudfront.net',
            'https://*.cloudfront.net'
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'http://*.cloudfront.net',
            'https://*.cloudfront.net'
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://polyfill.io',
            'http://localhost:35729',
            'http://*.cloudfront.net',
            'https://*.cloudfront.net'
          ]
        }
      },
      expectCt: {
        enforce: true,
        // https://httpwg.org/http-extensions/expect-ct.html#maximum-max-age
        maxAge: 30 * 24 * 60 * 60 * 1000
      }
    },
    // <https://github.com/ladjs/timeout>
    timeout: {
      ms: process.env[`${prefix}_TIMEOUT_MS`]
        ? parseInt(process.env[`${prefix}_TIMEOUT_MS`], 10)
        : 30000,
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

const fs = require('node:fs');
const process = require('node:process');
const util = require('node:util');
const dayjs = require('dayjs-with-plugins');
const isSANB = require('is-string-and-not-blank');
const semver = require('semver');
const { boolean } = require('boolean');

const RATE_LIMIT_EXCEEDED = 'Rate limit exceeded, retry in %s.';

const TIMEOUT_MESSAGE =
  'Your request has timed out and we have been alerted of this issue. Please try again or contact us.';

// eslint-disable-next-line complexity
function sharedConfig(prefix, env = process.env.NODE_ENV || 'development') {
  prefix = prefix.toUpperCase();
  let ssl = false;

  const keys = ['KEY', 'CERT', 'CA'];
  const validKeys = keys.filter((key) =>
    isSANB(process.env[`${prefix}_SSL_${key}_PATH`])
  );
  if (validKeys.length > 0) {
    ssl = { allowHTTP1: true };
    if (semver.gte(process.version, 'v18.16.0')) ssl.ecdhCurve = 'auto';
    for (const key of validKeys) {
      ssl[key.toLowerCase()] = fs.readFileSync(
        process.env[`${prefix}_SSL_${key}_PATH`]
      );
    }
  }

  const port = process.env[`${prefix}_PORT`] || 0;
  const serverHost = process.env[`${prefix}_SERVER_HOST`] || '::';
  const protocol = process.env[`${prefix}_PROTOCOL`] || 'http';

  const config = {
    // this is used as defaults for `app.listen(port, serverHost)`
    port,
    // by listening on '0.0.0.0' by default we avoid IPv6 issues
    // <https://stackoverflow.com/questions/29411551/express-js-req-ip-is-returning-ffff127-0-0-1>
    // <https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback
    // <https://github.com/koajs/koa/issues/599>
    // <https://stackoverflow.com/a/33957043>
    serverHost,
    protocol,
    ...(ssl ? { ssl } : {}),
    routes: false,
    passport: false,
    i18n: {},
    rateLimit:
      env === 'development'
        ? false
        : {
            errorMessage(exp, ctx) {
              const fn =
                typeof ctx.request.t === 'function'
                  ? ctx.request.t
                  : util.format;
              return fn(
                RATE_LIMIT_EXCEEDED,
                dayjs()
                  .add(exp, 'ms')
                  .locale(ctx.state.locale || 'en')
                  .fromNow(true)
              );
            },
            duration: process.env[`${prefix}_RATELIMIT_DURATION`]
              ? Number.parseInt(process.env[`${prefix}_RATELIMIT_DURATION`], 10)
              : 60_000,
            max: process.env[`${prefix}_RATELIMIT_MAX`]
              ? Number.parseInt(process.env[`${prefix}_RATELIMIT_MAX`], 10)
              : 1000,
            id: (ctx) => ctx.ip,
            prefix:
              process.env[`${prefix}_RATELIMIT_PREFIX`] ||
              `${prefix}_limit_${env}`.toLowerCase(),
            // whitelist/blacklist parsing inspired by `dotenv-parse-variables`
            allowlist: process.env[`${prefix}_RATELIMIT_WHITELIST`]
              ? process.env[`${prefix}_RATELIMIT_WHITELIST`]
                  .split(',')
                  .filter((string) => string !== '')
              : [],
            blocklist: process.env[`${prefix}_RATELIMIT_BLACKLIST`]
              ? process.env[`${prefix}_RATELIMIT_BLACKLIST`]
                  .split(',')
                  .filter((string) => string !== '')
              : []
          },
    // <https://github.com/ladjs/timeout>
    timeout: {
      ms: process.env[`${prefix}_TIMEOUT_MS`]
        ? Number.parseInt(process.env[`${prefix}_TIMEOUT_MS`], 10)
        : 30_000,
      message: (ctx) =>
        typeof ctx.request.t === 'function'
          ? ctx.request.t(TIMEOUT_MESSAGE)
          : TIMEOUT_MESSAGE
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
      username: process.env[`${prefix}_REDIS_USERNAME`] || null,
      port: process.env[`${prefix}_REDIS_PORT`]
        ? Number.parseInt(process.env[`${prefix}_REDIS_PORT`], 10)
        : 6379,
      host: process.env[`${prefix}_REDIS_HOST`] || 'localhost',
      password: process.env[`${prefix}_REDIS_PASSWORD`] || null,
      showFriendlyErrorStack: boolean(
        process.env[`${prefix}_REDIS_SHOW_FRIENDLY_ERROR_STACK`]
      ),
      //
      // NOTE: we override default values in ioredis for `maxRetriesPerRequest`
      //       and also `maxLoadingRetryTime`, because otherwise the default values
      //       of 20 * 10000 would cause 200s retry time, which is more than the
      //       HTTP default timeout per request of 30s as per above, and we use
      //       sensible default values of 3 * 3000 = 9s max redis retry time
      //
      // default in ioredis is 20
      maxRetriesPerRequest: process.env[
        `${prefix}_REDIS_MAX_RETRIES_PER_REQUEST`
      ]
        ? Number.parseInt(
            process.env[`${prefix}_REDIS_MAX_RETRIES_PER_REQUEST`],
            10
          )
        : 3,
      // default in ioredis is 10000 (10s)
      maxLoadingRetryTime: process.env[`${prefix}_REDIS_MAX_LOADING_RETRY_TIME`]
        ? Number.parseInt(
            process.env[`${prefix}_REDIS_MAX_LOADING_RETRY_TIME`],
            10
          )
        : 3000
    },
    redisMonitor: boolean(process.env[`${prefix}_REDIS_MONITOR`]),
    // <https://github.com/koajs/cors#corsoptions>
    cors: {}
  };

  // <https://stackoverflow.com/a/66810848>
  if (boolean(process.env[`${prefix}_REDIS_TLS`])) config.redis.tls = {};

  return config;
}

module.exports = sharedConfig;

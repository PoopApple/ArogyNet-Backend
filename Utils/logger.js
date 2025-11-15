const os = require('os');
const util = require('util');

// Lightweight structured logger. Writes to stdout with JSON payload for easy scraping.
// Usage: logger.info('message', { key: 'value' })

const levelPriority = { error: 0, warn: 1, info: 2, debug: 3 };
const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

const baseMeta = () => ({
  ts: new Date().toISOString(),
  host: os.hostname(),
  service: 'arogyanet-backend',
});

function formatLog(level, message, meta) {
  const payload = {
    level,
    msg: message,
    ...baseMeta(),
    ...(meta || {}),
  };
  return JSON.stringify(payload);
}

function shouldLog(level) {
  return levelPriority[level] <= levelPriority[configuredLevel];
}

const logger = {
  info(message, meta) {
    if (!shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    if (!shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(formatLog('warn', message, meta));
  },
  debug(message, meta) {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(formatLog('debug', message, meta));
  },
  error(message, meta) {
    if (!shouldLog('error')) return;
    // Ensure errors include stack when available
    const enriched = { ...meta };
    if (meta instanceof Error) {
      enriched.err = {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
      };
    } else if (meta && meta.err instanceof Error) {
      enriched.err = {
        name: meta.err.name,
        message: meta.err.message,
        stack: meta.err.stack,
      };
    }
    // eslint-disable-next-line no-console
    console.error(formatLog('error', message, enriched));
  },
  // Helper to attach request context quickly
  withReq(req, extra) {
    const base = {
      reqId: req.id || req.requestId,
      userId: req.user?.id,
      role: req.user?.role,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
      path: req.originalUrl || req.url,
      method: req.method,
      ...extra,
    };
    return base;
  },
};

module.exports = logger;

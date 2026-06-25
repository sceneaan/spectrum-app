/**
 * Dev-only debug logging. Production builds strip console via babel;
 * use logger.debug for verbose traces (video, socket) instead of console.log.
 */

const noop = () => {};

export const logger = {
  debug: __DEV__ ? (...args) => console.log(...args) : noop,
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;

/**
 * Lightweight structured client logger with scope support.
 */

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

export const logger = {
  info(scope, ...args) {
    if (isDev) {
      console.info(`[${scope}]`, ...args);
    }
  },
  warn(scope, ...args) {
    console.warn(`[${scope}]`, ...args);
  },
  error(scope, ...args) {
    console.error(`[${scope}]`, ...args);
  },
  debug(scope, ...args) {
    if (isDev) {
      console.debug(`[${scope}]`, ...args);
    }
  }
};


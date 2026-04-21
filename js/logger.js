export const logger = {
  info(message, context = {}) {
    console.info(`[COMSATSPrepHub] ${message}`, context);
  },
  warn(message, context = {}) {
    console.warn(`[COMSATSPrepHub] ${message}`, context);
  },
  error(message, error, context = {}) {
    console.error(`[COMSATSPrepHub] ${message}`, { error, ...context });
  }
};


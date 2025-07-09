/**
 * @design_doc   Logging utility for application monitoring
 * @related_to   Payment processing, error tracking
 * @known_issues None currently
 */
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = pino({
  level: isDevelopment ? 'trace' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;

/**
 * @design_doc   Logging utility for application monitoring
 * @related_to   Payment processing, error tracking
 * @known_issues Development logs are not pretty-printed because pino transport workers break in Next dev chunks
 */
import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

const logger = pino({
  level: isDevelopment ? 'trace' : 'info',
})

export default logger

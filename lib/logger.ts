/**
 * @design_doc   Logging utility for application monitoring
 * @related_to   Payment processing, error tracking
 * @known_issues None currently
 */

interface LogObject {
  [key: string]: any
}

interface Logger {
  info(obj: LogObject, message?: string): void
  info(message: string): void
  warn(obj: LogObject, message?: string): void
  warn(message: string): void
  error(obj: LogObject, message?: string): void
  error(message: string): void
  debug(obj: LogObject, message?: string): void
  debug(message: string): void
}

const createLogger = (): Logger => ({
  info: (objOrMessage: LogObject | string, message?: string) => {
    if (typeof objOrMessage === 'string') {
      console.log(`[INFO] ${objOrMessage}`)
    } else {
      console.log(`[INFO] ${message || 'Info'}`, objOrMessage)
    }
  },
  
  warn: (objOrMessage: LogObject | string, message?: string) => {
    if (typeof objOrMessage === 'string') {
      console.warn(`[WARN] ${objOrMessage}`)
    } else {
      console.warn(`[WARN] ${message || 'Warning'}`, objOrMessage)
    }
  },
  
  error: (objOrMessage: LogObject | string, message?: string) => {
    if (typeof objOrMessage === 'string') {
      console.error(`[ERROR] ${objOrMessage}`)
    } else {
      console.error(`[ERROR] ${message || 'Error'}`, objOrMessage)
    }
  },
  
  debug: (objOrMessage: LogObject | string, message?: string) => {
    if (typeof objOrMessage === 'string') {
      console.debug(`[DEBUG] ${objOrMessage}`)
    } else {
      console.debug(`[DEBUG] ${message || 'Debug'}`, objOrMessage)
    }
  }
})

const logger = createLogger()

export default logger
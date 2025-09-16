export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  meta?: Record<string, any>
  requestId?: string
  userId?: string
}

class Logger {
  private level: LogLevel
  private isProduction: boolean

  constructor() {
    this.level = this.getLogLevelFromEnv()
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase()
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR
      case 'WARN': return LogLevel.WARN
      case 'INFO': return LogLevel.INFO
      case 'DEBUG': return LogLevel.DEBUG
      default: return this.isProduction ? LogLevel.INFO : LogLevel.DEBUG
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      requestId: this.generateRequestId(),
      userId: meta?.userId
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    const formatted = this.isProduction 
      ? JSON.stringify(entry)
      : this.formatForConsole(entry)

    if (this.isProduction) {
      // In production, you might want to send to a logging service
      console.log(formatted)
    } else {
      console.log(formatted)
    }
  }

  private formatForConsole(entry: LogEntry): string {
    const levelColor = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.INFO]: '\x1b[36m', // Cyan
      [LogLevel.DEBUG]: '\x1b[90m' // Gray
    }[entry.level]

    const resetColor = '\x1b[0m'
    const levelName = LogLevel[entry.level]
    
    let log = `${levelColor}[${levelName}]${resetColor} ${entry.timestamp}`
    
    if (entry.requestId) {
      log += ` [${entry.requestId}]`
    }
    
    if (entry.userId) {
      log += ` [User: ${entry.userId}]`
    }
    
    log += ` ${entry.message}`
    
    if (entry.meta) {
      log += ` ${JSON.stringify(entry.meta)}`
    }
    
    return log
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage(LogLevel.ERROR, message, meta))
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage(LogLevel.WARN, message, meta))
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage(LogLevel.INFO, message, meta))
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log(this.formatMessage(LogLevel.DEBUG, message, meta))
  }

  // Convenience methods for specific contexts
  logApiError(endpoint: string, error: any, userId?: string): void {
    this.error(`API Error: ${endpoint}`, {
      error: error.message || error,
      stack: error.stack,
      userId
    })
  }

  logApiRequest(method: string, endpoint: string, userId?: string): void {
    this.info(`API Request: ${method} ${endpoint}`, { userId })
  }

  logTrade(tradeId: string, action: string, userId?: string): void {
    this.info(`Trade Action: ${action}`, { tradeId, userId })
  }

  logOrder(orderId: string, action: string, userId?: string): void {
    this.info(`Order Action: ${action}`, { orderId, userId })
  }

  logAuth(event: string, userId?: string, meta?: Record<string, any>): void {
    this.info(`Auth Event: ${event}`, { userId, ...meta })
  }

  logSecurity(event: string, meta?: Record<string, any>): void {
    this.warn(`Security Event: ${event}`, meta)
  }

  logPerformance(operation: string, duration: number, meta?: Record<string, any>): void {
    this.debug(`Performance: ${operation} took ${duration}ms`, meta)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export a request-specific logger factory
export function createRequestLogger(requestId: string, userId?: string) {
  return {
    error: (message: string, meta?: Record<string, any>) => 
      logger.error(message, { ...meta, requestId, userId }),
    warn: (message: string, meta?: Record<string, any>) => 
      logger.warn(message, { ...meta, requestId, userId }),
    info: (message: string, meta?: Record<string, any>) => 
      logger.info(message, { ...meta, requestId, userId }),
    debug: (message: string, meta?: Record<string, any>) => 
      logger.debug(message, { ...meta, requestId, userId })
  }
}
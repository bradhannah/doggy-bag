// Logger - Centralized logging utility for frontend
// Mirrors the backend logger API (api/src/utils/logger.ts)

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

// Check if running in development mode
const isDev = (): boolean => {
  return import.meta.env?.DEV ?? false;
};

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `[${level}] [${this.context}] ${message}`;
  }

  public debug(message: string, data?: unknown): void {
    if (isDev()) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message);
      if (data !== undefined) {
        console.debug(formatted, data);
      } else {
        console.debug(formatted);
      }
    }
  }

  public info(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.INFO, message);
    if (data !== undefined) {
      console.info(formatted, data);
    } else {
      console.info(formatted);
    }
  }

  public warn(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.WARN, message);
    if (data !== undefined) {
      console.warn(formatted, data);
    } else {
      console.warn(formatted);
    }
  }

  public error(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message);
    if (data !== undefined) {
      console.error(formatted, data);
    } else {
      console.error(formatted);
    }
  }
}

/**
 * Create a logger instance with a specific context
 * @param context - The context/module name for log messages (e.g., 'API Client', 'Settings Store')
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Pre-configured loggers for common use cases
export const apiLogger = createLogger('API');
export const storeLogger = createLogger('Store');
export const uiLogger = createLogger('UI');

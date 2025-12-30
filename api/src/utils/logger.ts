// Logger - Centralized logging utility for backend

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

class Logger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data
    };
    
    const logMessage = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
  
  public debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, message, data);
    }
  }
  
  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  public error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

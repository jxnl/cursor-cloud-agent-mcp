/**
 * Structured logging utility for MCP server
 * Supports JSON and pretty formats with configurable log levels
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private format: "json" | "pretty";

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
    const validLevels: LogLevel[] = ["debug", "info", "warn", "error"];
    this.level = validLevels.includes(envLevel) ? envLevel : "info";

    const envFormat = (process.env.LOG_FORMAT || "pretty").toLowerCase();
    this.format = envFormat === "json" ? "json" : "pretty";
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.format === "json") {
      return JSON.stringify(logEntry);
    }

    // Pretty format
    const contextStr = context
      ? ` ${Object.entries(context)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(" ")}`
      : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog("error")) {
      const errorContext: LogContext = {
        ...context,
      };

      if (error instanceof Error) {
        errorContext.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error !== undefined) {
        errorContext.error = String(error);
      }

      console.error(this.formatMessage("error", message, errorContext));
    }
  }
}

export const logger = new Logger();


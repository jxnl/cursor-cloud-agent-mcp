/**
 * Custom error classes for MCP server
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Sanitize error messages to prevent leaking sensitive information
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Don't expose full API error details in production
    if (process.env.NODE_ENV === "production") {
      return `API request failed with status ${error.statusCode}`;
    }
    return error.message;
  }

  if (error instanceof Error) {
    // Don't expose stack traces in production
    if (process.env.NODE_ENV === "production") {
      return error.message;
    }
    return `${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }

  return String(error);
}


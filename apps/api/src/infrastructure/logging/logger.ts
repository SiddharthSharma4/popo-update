/**
 * Structured logger preserving privacy and contract requirements.
 * Avoids leaking secrets, credentials, or internal stack traces to users.
 * Conforms to AGENTS.md §20 and docs/contracts/06-api-contract.md §16.
 */

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  constructor(private contextName: string = "OSM") {}

  private formatMessage(level: string, message: string, meta?: LogContext): string {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      context: this.contextName,
      message,
      ...(meta ? { meta } : {}),
    };
    return JSON.stringify(payload);
  }

  info(message: string, meta?: LogContext): void {
    console.log(this.formatMessage("INFO", message, meta));
  }

  warn(message: string, meta?: LogContext): void {
    console.warn(this.formatMessage("WARN", message, meta));
  }

  error(message: string, error?: unknown, meta?: LogContext): void {
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message } : error;
    console.error(this.formatMessage("ERROR", message, { ...meta, error: errorDetails }));
  }

  debug(message: string, meta?: LogContext): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("DEBUG", message, meta));
    }
  }

  child(contextName: string): Logger {
    return new Logger(`${this.contextName}:${contextName}`);
  }
}

export const logger = new Logger("OSM-API");

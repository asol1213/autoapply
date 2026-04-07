/**
 * Simple request logger with timestamps.
 * Format: [2026-04-07 12:00:00] [INFO] POST /api/applications — 200 in 5ms
 */

type LogLevel = "INFO" | "WARN" | "ERROR";

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function format(level: LogLevel, message: string): string {
  return `[${timestamp()}] [${level}] ${message}`;
}

export const logger = {
  info(message: string) {
    console.log(format("INFO", message));
  },
  warn(message: string) {
    console.warn(format("WARN", message));
  },
  error(message: string) {
    console.error(format("ERROR", message));
  },

  /**
   * Log an HTTP request with timing.
   * Call at the start of a request handler; returns a `done` function to call when finished.
   *
   * Usage:
   *   const done = logger.request("POST", "/api/applications");
   *   // ... handle request ...
   *   done(200);
   */
  request(method: string, path: string): (status: number) => void {
    const start = performance.now();
    return (status: number) => {
      const ms = Math.round(performance.now() - start);
      const level: LogLevel = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
      const msg = `${method} ${path} — ${status} in ${ms}ms`;
      switch (level) {
        case "ERROR":
          console.error(format(level, msg));
          break;
        case "WARN":
          console.warn(format(level, msg));
          break;
        default:
          console.log(format(level, msg));
      }
    };
  },
};

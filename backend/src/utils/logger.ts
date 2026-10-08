type LogLevel = "info" | "warn" | "error" | "debug";

function formatMessage(level: LogLevel, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  info: (msg: string, meta?: unknown) => console.log(formatMessage("info", msg, meta)),
  warn: (msg: string, meta?: unknown) => console.warn(formatMessage("warn", msg, meta)),
  error: (msg: string, meta?: unknown) => console.error(formatMessage("error", msg, meta)),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("debug", msg, meta));
    }
  },
};

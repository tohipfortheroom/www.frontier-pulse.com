import { inspect } from "node:util";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogModule = "ingestion" | "scoring" | "api" | "ui" | "llm";

type LogRecord = {
  timestamp: string;
  level: LogLevel;
  module: LogModule;
  message: string;
  metadata?: Record<string, unknown>;
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\u001B[36m",
  info: "\u001B[32m",
  warn: "\u001B[33m",
  error: "\u001B[31m",
};

function formatDevelopmentLog(record: LogRecord) {
  const color = LEVEL_COLORS[record.level];
  const reset = "\u001B[0m";
  const metadata = record.metadata && Object.keys(record.metadata).length > 0 ? ` ${inspect(record.metadata, { depth: 6, colors: true })}` : "";
  return `${color}[${record.level.toUpperCase()}]${reset} ${record.module} ${record.message}${metadata}`;
}

function write(record: LogRecord) {
  if (process.env.NODE_ENV === "production") {
    console.info(JSON.stringify(record));
    return;
  }

  console.info(formatDevelopmentLog(record));
}

export const logger = {
  debug(module: LogModule, message: string, metadata?: Record<string, unknown>) {
    write({
      timestamp: new Date().toISOString(),
      level: "debug",
      module,
      message,
      metadata,
    });
  },
  info(module: LogModule, message: string, metadata?: Record<string, unknown>) {
    write({
      timestamp: new Date().toISOString(),
      level: "info",
      module,
      message,
      metadata,
    });
  },
  warn(module: LogModule, message: string, metadata?: Record<string, unknown>) {
    write({
      timestamp: new Date().toISOString(),
      level: "warn",
      module,
      message,
      metadata,
    });
  },
  error(module: LogModule, message: string, metadata?: Record<string, unknown>) {
    write({
      timestamp: new Date().toISOString(),
      level: "error",
      module,
      message,
      metadata,
    });
  },
};

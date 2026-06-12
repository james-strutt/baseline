type LogContext = Record<string, unknown>;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: LogContext, componentName?: string): void;
  info(message: string, context?: LogContext, componentName?: string): void;
  warn(message: string, context?: LogContext, componentName?: string): void;
  error(message: string, context?: LogContext, componentName?: string): void;
}

function emitLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  componentName?: string,
): void {
  const line = componentName !== undefined ? `[${componentName}] ${message}` : message;
  const sink = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }[level];
  if (context !== undefined) {
    sink(line, context);
  } else {
    sink(line);
  }
}

export const logger: Logger = {
  debug: (message, context, componentName): void =>
    emitLog('debug', message, context, componentName),
  info: (message, context, componentName): void =>
    emitLog('info', message, context, componentName),
  warn: (message, context, componentName): void =>
    emitLog('warn', message, context, componentName),
  error: (message, context, componentName): void =>
    emitLog('error', message, context, componentName),
};

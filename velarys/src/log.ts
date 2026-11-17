export type LogLevel = 'debug' | 'info' | 'warning' | 'error';
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warning: 30, error: 40 };

let threshold: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  threshold = level;
}

function write(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[threshold]) return;
  const suffix = extra && Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : '';
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}${suffix}`;
  if (level === 'error' || level === 'warning') console.error(line);
  else console.log(line);
}

export const log = {
  debug: (m: string, e?: Record<string, unknown>) => write('debug', m, e),
  info: (m: string, e?: Record<string, unknown>) => write('info', m, e),
  warning: (m: string, e?: Record<string, unknown>) => write('warning', m, e),
  error: (m: string, e?: Record<string, unknown>) => write('error', m, e),
};

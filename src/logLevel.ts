// Source - https://stackoverflow.com/a/71945252
// Posted by haschtl, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-28, License - CC BY-SA 4.0

export const logLevels = ["debug", "log", "warn", "error", "none"] as const;
type LogLevel = (typeof logLevels)[number];

declare global {
  var logLevel: LogLevel;
}

const shouldLog = (level: LogLevel) => {
  return logLevels.indexOf(level) >= logLevels.indexOf(global.logLevel);
};

global.logLevel = "debug";

const _console = console
global.console = {
  ...global.console,
  log: (message?: any, ...optionalParams: any[]) => {
    shouldLog("log") && _console.log(message, ...optionalParams);
  },
  warn: (message?: any, ...optionalParams: any[]) => {
    shouldLog("warn") && _console.warn(message, ...optionalParams);
  },
  error: (message?: any, ...optionalParams: any[]) => {
    shouldLog("error") && _console.error(message, ...optionalParams);
  },
  debug: (message?: any, ...optionalParams: any[]) => {
    shouldLog("debug") && _console.debug(message, ...optionalParams);
  },
};

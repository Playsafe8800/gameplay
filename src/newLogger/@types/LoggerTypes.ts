export const LogLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export type ManageLoggerRequestTypes = 'grpc' | 'rest';

export const LogLevelKeys = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

export const TransportNames = {
  CONSOLE: 'console',
  FILE: 'file',
};

export enum Transports {
  CONSOLE = 'CONSOLE',
  FILE = 'FILE',
}

export const LogLevelsGrpcMapping = {
  [LogLevelKeys.ERROR]: LogLevel.ERROR,
  [LogLevelKeys.INFO]: LogLevel.INFO,
  [LogLevelKeys.WARN]: LogLevel.WARN,
  [LogLevelKeys.DEBUG]: LogLevel.DEBUG,
};

export const TransportGrpcMapping = {
  [TransportNames.CONSOLE]: Transports.CONSOLE,
  [TransportNames.FILE]: Transports.FILE,
};

interface LogLevelRequest {
  transport: Transports | string;
  level: LogLevel | string;
}
export interface SetLogLevelsRequest {
  newLevels: Array<LogLevelRequest>;
}

export interface LoggerConfigIF {
  appName: string;
  maxFileSize: number;
  logFileDirectory: string;
  disableFileLogging: boolean;
  pid?: number;
}
export interface checkCurentLevelsResponseInterface {
  currentLevels: {
    appenders: string;
    level: string;
  }[];
}

export interface Level {
  isEqualTo(other: string): boolean;
  isEqualTo(otherLevel: Level): boolean;
  isLessThanOrEqualTo(other: string): boolean;
  isLessThanOrEqualTo(otherLevel: Level): boolean;
  isGreaterThanOrEqualTo(other: string): boolean;
  isGreaterThanOrEqualTo(otherLevel: Level): boolean;
  colour: string;
  level: number;
  levelStr: string;
}
export interface LoggerOptions {
  pid: number;
  filesize: number;
}

export declare const LogLevels: {
    error: number;
    warn: number;
    info: number;
    debug: number;
};
export type ManageLoggerRequestTypes = 'grpc' | 'rest';
export declare const LogLevelKeys: {
    ERROR: string;
    WARN: string;
    INFO: string;
    DEBUG: string;
};
export declare enum LogLevel {
    ERROR = "ERROR",
    WARN = "WARN",
    INFO = "INFO",
    DEBUG = "DEBUG"
}
export declare const TransportNames: {
    CONSOLE: string;
    FILE: string;
};
export declare enum Transports {
    CONSOLE = "CONSOLE",
    FILE = "FILE"
}
export declare const LogLevelsGrpcMapping: {
    [x: string]: LogLevel;
};
export declare const TransportGrpcMapping: {
    [x: string]: Transports;
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
export {};

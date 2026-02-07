export declare class Logger {
    private static isInitialized;
    private static logger;
    /**
     * @description Initializes Winston logger. Will pick all required config from `/opt/service-config/logger-config.json`
     */
    static initializeLogger(): Promise<void>;
    static warn(...messages: any[]): void;
    static info(...messages: any[]): void;
    static debug(...messages: any[]): void;
    static error(...messages: any[]): void;
    static printLogs(): string;
}

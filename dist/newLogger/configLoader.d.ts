import { LoggerConfigIF } from './@types/LoggerTypes';
export declare class ConfigLoader {
    private static instance;
    private static configData;
    private constructor();
    static getInstance(): ConfigLoader;
    static loadLoggerConfig(): Promise<void>;
    getLoggerConfig(): LoggerConfigIF;
}

import winston from 'winston';
import { formatLogMessages } from './utils/loggerUtils';
import LokiTransport from "winston-loki"
import newrelicFormatter from '@newrelic/winston-enricher';

export class Logger {
  private static isInitialized: boolean;
  private static logger: winston.Logger;


  /**
   * @description Initializes Winston logger. Will pick all required config from `/opt/service-config/logger-config.json`
   */
  public static async initializeLogger() {
    try {
      if (Logger.isInitialized) {
        return;
      }

      Logger.logger = winston.createLogger({
        level: "info",
        format: newrelicFormatter(winston)(),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `[${timestamp}] [${level}] - ${message} - ${JSON.stringify(meta)}`;
              })
            ),
          }),
          new LokiTransport({
            host: "http://grafana.entwikgaming.com:3100",
            labels: { app: `gameplay-service-${process.env.NODE_ENV}` },
            json: true,
            batching: true,
            interval: 5,
            replaceTimestamp: true,
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `[${timestamp}] [${level}] ${message} ${JSON.stringify(meta)}`;
              })
            ),
            onConnectionError: (err) => console.error("Loki connection error:", err),
          })
        ],
      });

      Logger.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Winston logger: ', [error]);
      throw error;
    }
  }

  public static warn(...messages: any[]) {
    Logger.logger.warn(formatLogMessages(messages));
  }

  public static info(...messages: any[]) {
    Logger.logger.info(formatLogMessages(messages));
  }

  public static debug(...messages: any[]) {
    Logger.logger.debug(formatLogMessages(messages));
  }

  public static error(...messages: any[]) {
    Logger.logger.error(messages);
  }

  public static printLogs(): string {
    Logger.logger.error('TEST LOGS');
    Logger.logger.debug('TEST LOGS');
    Logger.logger.info('TEST LOGS');
    Logger.logger.warn('TEST LOGS');
    return 'OK';
  }
}

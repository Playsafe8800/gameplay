import { LoggerConfigIF } from './@types/LoggerTypes';
import getPm2Id from './utils/pm2IdProvider';

export class ConfigLoader {
  private static instance: ConfigLoader;
  private static configData: LoggerConfigIF;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance() {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public static async loadLoggerConfig() {
    try {
      this.configData = {
        maxFileSize: 1073741824,
        appName: 'cashRummy',
        logFileDirectory: './',
        disableFileLogging: true,
      };

      // if running via PM2, get PM2 ID
      const pm2Id = await getPm2Id();
      if (Number.isInteger(pm2Id)) this.configData.pid = pm2Id;
    } catch (error) {
      throw error;
    }
  }

  public getLoggerConfig() {
    return ConfigLoader.configData;
  }
}

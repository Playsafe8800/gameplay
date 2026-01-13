import { Logger } from '../newLogger';
import zk from './zk';
import Redis from 'ioredis';

class RedisI {
  queryClient!: Redis;

  connectionCallback = async (
    resolve: (
      value: Redis | PromiseLike<Redis>,
    ) => void,
    reject: (reason?: any) => void,
  ) => {
    if (this.queryClient && this.queryClient instanceof Redis) {
      resolve(this.queryClient);
      return;
    }
    const {
      GAMEPLAY_REDIS_HOST,
      GAMEPLAY_REDIS_PASSWORD,
      GAMEPLAY_REDIS_PORT,
    } = zk.getConfig();

    const redisOptions = {
      host: GAMEPLAY_REDIS_HOST,
      port: GAMEPLAY_REDIS_PORT,
      ...(GAMEPLAY_REDIS_PASSWORD && { password: GAMEPLAY_REDIS_PASSWORD }),
    };

    Logger.info({
      host: GAMEPLAY_REDIS_HOST,
      port: GAMEPLAY_REDIS_PORT,
    });

    this.queryClient = new Redis(redisOptions);

    this.queryClient.on('error', (error: any) => {
      Logger.error('INTERNAL_SERVER_ERROR Redis Client error : ', [error]);
      reject(error);
    });

    this.queryClient.on('ready', () => {
      Logger.info('Redis connected successfully');
      resolve(this.queryClient);
    });
  };

  init = async (): Promise<Redis> =>
    new Promise(this.connectionCallback);
}

export default new RedisI();

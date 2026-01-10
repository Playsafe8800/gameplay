import { Logger } from '../newLogger';
import zk from './zk';
import { Cluster } from 'ioredis';

class Redis {
  queryClient!: Cluster;

  connectionCallback = async (
    resolve: (
      value: Cluster | PromiseLike<Cluster>,
    ) => void,
    reject: (reason?: any) => void,
  ) => {
    if (
      this.queryClient &&
      this.queryClient instanceof Cluster
    ) {
      resolve(this.queryClient);
      return;
    }
    const {
      GAMEPLAY_REDIS_HOST,
      GAMEPLAY_REDIS_PASSWORD,
      GAMEPLAY_REDIS_PORT,
    } = zk.getConfig();

    const nodes = [{
      host: GAMEPLAY_REDIS_HOST,
      port: GAMEPLAY_REDIS_PORT
    }]

    const clusterOptions: any = {
      redisOptions: {
        ...(GAMEPLAY_REDIS_PASSWORD && { password: GAMEPLAY_REDIS_PASSWORD }),
      }
    };

    const log = {
      nodes,
      ...(GAMEPLAY_REDIS_PASSWORD && { password: GAMEPLAY_REDIS_PASSWORD }),
    };
    Logger.info(log);
    this.queryClient = new Cluster(nodes, clusterOptions);

    this.queryClient.on('error', (error: any) => {
      Logger.error('INTERNAL_SERVER_ERROR Redis Client error : ', [error]);
      reject(error);
    });

    this.queryClient.on('node error', (error, node) => {
      Logger.error(`INTERNAL_SERVER_ERROR Redis Cluster node error (${node}): `, [error]);
      reject(error);
    });

    this.queryClient.on('ready', () => {
      Logger.info('Redis connected successfully');
      resolve(this.queryClient);
    });
  };

  init = async (): Promise<Cluster> =>
    new Promise(this.connectionCallback);
}

export default new Redis();

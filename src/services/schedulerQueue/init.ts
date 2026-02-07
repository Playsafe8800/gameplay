const bull = require('bullmq');
import Redis from 'ioredis';
import { Logger } from '../../newLogger';
import { zk } from '../../connections';

export abstract class Initializer {
  static queueMap: Map<string, typeof bull.Queue> = new Map();
  Queue: typeof bull.Queue;
  private readonly redis!: any;
  public options: Object = {};
  public workerOpts: Object = {};

  constructor(QueueName: string) {
    const config = zk.getConfig;
    const hostName =
      process.env.SCHEDULER_REDIS_HOST
    const schedulerPort =
      process.env.SCHEDULER_REDIS_PORT

    const redisPassword = process.env.SCHEDULER_REDIS_PASSWORD;

    this.redis = new Redis({
      host: `${hostName}`,
      port: Number.parseInt(`${schedulerPort}`),
      ...(redisPassword ? { password: redisPassword } : {}),
    });

    const queueNameHash = `${QueueName}-${process.env.DEPLOYMENT_HASH}`;

    this.Queue = new bull.Queue(queueNameHash, {
      connection: this.redis,
      prefix: queueNameHash,
    });

    this.options = {
      attempts: 50,
      backoff: {
        type: 'fixed',
        delay: 500,
      },
      removeOnComplete: true,
      removeOnFail: { age: 600 } // 10 minutes
    }

    this.workerOpts = {
      removeOnFail: { age: 1800 },
      concurrency: 5
    }

    Initializer.queueMap.set(queueNameHash, this.Queue);
    this.Queue.on('error', (error: Error) => {
      Logger.error(`INTERNAL_SERVER_ERROR Error for Queue ${queueNameHash}: Error => `, [
        error,
      ]);
    });
  }

  static async shutdownQueues() {
    const queues = Array.from(Initializer.queueMap.values());
    await Promise.all(queues.map(async (queue) => {
      try {
        await queue.pause();
        await queue.obliterate();
        Logger.info(`Queue ${queue.name} paused and obliterated`);
      } catch (error) {
        Logger.error(`INTERNAL_SERVER_ERROR Queue shutdown error: ${queue.name}`, [error]);
      }
    }));

    await require('./index').scheduler.closeWorkers();
  }
}
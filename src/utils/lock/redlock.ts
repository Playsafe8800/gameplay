import Redlock, { CompatibleRedisClient } from 'redlock';
import { Logger } from '../../newLogger';

export class RedisLock {
  private redlock!: Redlock;
  constructor() {
    this.initializeRedlock = this.initializeRedlock.bind(this);
  }

  private initializeRedlock(redisClient: CompatibleRedisClient) {
    if (this.redlock) return this.redlock;
    this.redlock = new Redlock([redisClient], {
      driftFactor: 0.01,
      retryCount: -1,
    });

    this.redlock.on('clientError', Logger.error);
    return this.redlock;
  }

  async init(redisClient) {
    return this.initializeRedlock(redisClient);
  }

  get Lock() {
    return this.redlock;
  }
}

export const redlock = new RedisLock();

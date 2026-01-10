import { redis } from '../../connections';


class Commands {
  private redisClient;
  constructor() {
    this.redisClient = redis.queryClient;
    if (!this.redisClient) process.exit(1);
  }

  get keyCommands() {
    return this.redisClient
  }

  get setCommands() {
    return {
      push: this.redisClient.rpush.bind(this.redisClient),
      pop: this.redisClient.spop.bind(this.redisClient),
      rem: this.redisClient.srem.bind(this.redisClient),
      lrange: this.redisClient.setrange.bind(this.redisClient)
    };
  }

  get sortedSetCommands() {
    return this.redisClient
  }

  get queueCommands() {
    return {
      push: this.redisClient.sadd.bind(this.redisClient),
      pop: this.redisClient.spop.bind(this.redisClient),
      peek: this.redisClient.lrange.bind(this.redisClient)
    };
  }

  get hashCommand() {
    return this.redisClient
  }
}

const commands = new Commands();

export = commands;

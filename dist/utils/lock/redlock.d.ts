import Redlock from 'redlock';
export declare class RedisLock {
    private redlock;
    constructor();
    private initializeRedlock;
    init(redisClient: any): Promise<Redlock>;
    get Lock(): Redlock;
}
export declare const redlock: RedisLock;

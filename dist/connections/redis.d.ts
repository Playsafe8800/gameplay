import Redis from 'ioredis';
declare class RedisI {
    queryClient: Redis;
    connectionCallback: (resolve: (value: Redis | PromiseLike<Redis>) => void, reject: (reason?: any) => void) => Promise<void>;
    init: () => Promise<Redis>;
}
declare const _default: RedisI;
export default _default;

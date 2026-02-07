declare const bull: any;
export declare abstract class Initializer {
    static queueMap: Map<string, typeof bull.Queue>;
    Queue: typeof bull.Queue;
    private readonly redis;
    options: Object;
    workerOpts: Object;
    constructor(QueueName: string);
    static shutdownQueues(): Promise<void>;
}
export {};

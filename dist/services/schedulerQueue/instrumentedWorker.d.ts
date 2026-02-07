import { Worker, WorkerOptions } from 'bullmq';
export declare function createInstrumentedWorker<T>(queueName: string, processor: (job: T) => Promise<any>, opts: WorkerOptions): Worker<T>;

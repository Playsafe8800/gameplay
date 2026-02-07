import { Worker, WorkerOptions } from 'bullmq';

export function createInstrumentedWorker<T>(
  queueName: string,
  processor: (job: T) => Promise<any>,
  opts: WorkerOptions,
): Worker<T> {
  const wrappedProcessor = async (job: any) => {
    // Directly execute the provided processor without New Relic instrumentation
    return processor(job);
  };

  return new Worker<T>(queueName, wrappedProcessor, opts);
}

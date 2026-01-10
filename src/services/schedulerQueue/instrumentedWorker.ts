import { Worker, WorkerOptions } from 'bullmq';
import newrelic from 'newrelic';

export function createInstrumentedWorker<T>(
  queueName: string,
  processor: (job: T) => Promise<any>,
  opts: WorkerOptions,
): Worker<T> {
  const wrappedProcessor = async (job: any) => {
    return newrelic.startBackgroundTransaction(
      `BullMQ:${queueName}`,
      async () => {
        const transaction = newrelic.getTransaction();
        try {
          const result = await newrelic.startSegment('ProcessorLogic', true, async () => {
            return await processor(job);
          });

          newrelic.recordCustomEvent('BullMQJobSuccess', {
            queue: queueName,
            jobId: job.id,
            name: job.name,
            attempts: job.attemptsMade,
            timestamp: job.timestamp,
            duration: Date.now() - job.timestamp,
          });

          transaction.end();
          return result;
        } catch (err: any) {
          newrelic.noticeError(err);
          newrelic.recordCustomEvent('BullMQJobFailure', {
            queue: queueName,
            jobId: job.id,
            reason: err.message,
          });
          transaction.end();
          throw err;
        }
      },
    );
  };

  return new Worker<T>(queueName, wrappedProcessor, opts);
}

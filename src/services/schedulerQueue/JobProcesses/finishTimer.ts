import { Logger } from '../../../newLogger';
import { FinishTimer as FinishTimerInterface } from '../../../objectModels';
import { finishGame } from '../../finishEvents/finishGame';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';


export class FinishTimer extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`finishTimer`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.finishTimerProcess(job),
      {
        connection: this.Queue.opts.connection,
        // Use the same prefix as the Queue to ensure workers see the jobs
        prefix: (this.Queue as any).opts.prefix,
        ...this.workerOpts,
      }
    );
    this.worker.on('error', (err) => {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
    });
  }

  private getJobId(
    tableId: string,
    currentRound: number,
    forOthers: boolean,
  ) {
    return `${tableId}:${currentRound}:${forOthers}:FINISH`;
  }

  readonly addFinishTimer = async (
    tableId: string,
    currentRound: number,
    userIds: Array<number>,
    timer: number,
    forOthers = false,
  ) => {
    try {
      Logger.info(
        `Adding To Queue addFinishTimer ${tableId}, ${timer}`,
      );
      const jobId = this.getJobId(tableId, currentRound, forOthers);
      const dataFinishTimerQueue: FinishTimerInterface = {
        tableId,
        currentRound,
        userIds,
      };

      await this.Queue.add(this.Queue.name, dataFinishTimerQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError finishTimerQueue ${tableId} ${error.message}`, error);
    }
  };

  private readonly finishTimerProcess = async (job: any) => {
    try {
      Logger.info('finishTimerProcess scheduler processed: ', [
        job.data,
      ]);
      const { userIds, tableId, currentRound } = job.data;
      // start processing here
      await finishGame.setFinishAfter(userIds, tableId, currentRound);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError finishTimerProcess', [error, job]);
      throw error
    }
  };

  readonly cancelFinishTimer = async (
    tableId: string,
    currentRound: number,
    forOthers = false,
  ) => {
    const jobId = this.getJobId(tableId, currentRound, forOthers);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
        // process here
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelFinishTimer ${jobId} => ${error.message}`,
        [error],
      );
    }
  };

  readonly closeWorker = async () => {
    try {
      return await this.worker.close();
    } catch (error) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError closeWorker `,
        [error],
      );
    }
  }
}

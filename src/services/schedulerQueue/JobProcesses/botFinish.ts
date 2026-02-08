import { Logger } from '../../../newLogger';
import { addbotFinishI } from '../../../objectModels';
import { Initializer } from '../init';
import { finishGame } from '../../../services/finishEvents/finishGame';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';


export class BotFinish extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`botFinish`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.addBotFinishProcess(job),
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

  private getJobId(tableId: string, userId: number) {
    return `${tableId}:${userId}:botFinish`;
  }

  readonly addBotFinish = async (
    tableId: string,
    userId: number,
    timer: number,
    group: Array<Array<string>>,
  ) => {
    try {
      Logger.info(
        `Adding To Queue addBotFinish ${tableId}, ${timer}`,
      );
      const jobId = this.getJobId(tableId, userId);
      const dataTableStartQueue: addbotFinishI = {
        tableId,
        userId,
        group,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      });
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotFinishQueue ${tableId} ${error.message}`, [error]);
    }
  };

  private readonly addBotFinishProcess = async (job: any) => {
    try {
      Logger.info('addBotFinishProcess scheduler processed: ', [
        job.data,
      ]);

      const { tableId, userId, group } = job.data;
      await finishGame.finishRound(
        { tableId, group },
        { userId },
        {
          eventID: 9,
          timeStamp: Date.now().toString(),
          retryCount: 1,
        },
      );

      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotFinishProcess', [error, job]);
      throw error
    }
  };

  readonly cancelBotFinish = async (
    tableId: string,
    userId: number,
  ) => {
    const jobId = this.getJobId(tableId, userId);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelBotFinish ${jobId} => ${error.message}`,
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

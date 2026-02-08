import { Logger } from '../../../newLogger';
import { addbotI } from '../../../objectModels';
import { Initializer } from '../init';
import { sitBotOnTable } from '../../signUp/addTable';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';


export class Bot extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`bot`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.addBotProcess(job),
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

  private getJobId(tableId: string, currentRound: number) {
    return `${tableId}:${currentRound}:bot`;
  }

  readonly addBot = async (
    tableId: string,
    currentRound: number,
    timer: number,
  ) => {
    try {
      Logger.info(`Adding To Queue addBot ${tableId}, ${timer}`);
      const jobId = this.getJobId(tableId, currentRound);
      const dataTableStartQueue: addbotI = {
        tableId,
        currentRound,
      };
      await this.Queue.add('test', { test: true }, { delay: 1000 });

      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId: `${jobId}-${timer}`,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotQueue ${tableId} ${error.message}`, [error]);
    }
  };

  private readonly addBotProcess = async (job: any) => {
    try {
      Logger.info('addBotProcess scheduler processed: ', [job.data]);
      await sitBotOnTable(job.data.tableId);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotProcess', [error, job]);
      throw error
    }
  };

  readonly cancelBot = async (
    tableId: string,
    currentRound: number,
  ) => {
    const jobId = this.getJobId(tableId, currentRound);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
        // process here
      }
      Logger.info('job cancelled ...', [tableId, currentRound]);
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError cancelBot ${jobId} => ${error.message}`, [error]);
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

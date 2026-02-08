import { Logger } from '../../../newLogger';
import { TableStartData } from '../../../objectModels';
import { tableOperation } from '../../signUp/tableOperation';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';


export class TableStart extends Initializer {
  private worker: Worker<TableStartData>;
  constructor() {
    super(`tableStart`);
    this.worker = createInstrumentedWorker<TableStartData>(
      this.Queue.name,
      (job) => this.tableStartProcess(job),
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

  getJobId(tableId: string) {
    return `${tableId}`;
  }

  readonly addTableStart = async (tableId: string, timer: number) => {
    try {
      Logger.info(
        `Adding To Queue addTableStart ${tableId}, ${timer}`,
      );
      const jobId = this.getJobId(tableId);
      const dataTableStartQueue: TableStartData = {
        tableId,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError tableStartQueue ${tableId} ${error.message}`, [error]);
    }
  };

  private readonly tableStartProcess = async (job: any) => {
    try {
      Logger.info('tableStartProcess scheduler processed: ', [
        job.data,
      ]);
      await tableOperation.initializeGameplayForFirstRound(job.data);
      return job.data;
    } catch (error) {
      Logger.error('SchedulerError tableStartProcess', [error, job]);
      throw error
    }
  };

  readonly cancelTableStart = async (tableId: string) => {
    const jobId = this.getJobId(tableId);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelTableStart ${jobId} => ${error.message}`,
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

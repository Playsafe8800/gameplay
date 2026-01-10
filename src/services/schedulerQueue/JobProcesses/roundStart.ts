import { Logger } from '../../../newLogger';
import { TableStartData } from '../../../objectModels';
import { round } from '../../gameplay/round';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';

export class RoundStart extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`roundStart`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.roundStartProcess(job),
      {
        connection: this.Queue.opts.connection,
        prefix: `{${this.Queue.name}}`,
        ...this.workerOpts,
      }
    );
    this.worker.on('error', (err) => {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
    });
  }

  private getJobId(tableId: string) {
    return `${tableId}:${Date.now()}`;
  }

  readonly addRoundStart = async (tableId: string, timer: number) => {
    try {
      Logger.info(
        `Adding To Queue addRoundStart ${tableId}, ${timer}`,
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
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError roundStartQueue ${tableId} ${error.message}`);
    }
  };

  private readonly roundStartProcess = async (job: any) => {
    try {
      Logger.info('roundStartProcess scheduler processed: ', [
        job.data,
      ]);
      // start processing here
      await round.startRound(job.data.tableId);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError roundStartProcess', [error, job]);
      throw error
    }
  };

  readonly cancelRoundStart = async (tableId: string) => {
    const jobId = this.getJobId(tableId);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
        // process here
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelRoundStart ${jobId} => ${error.message}`,
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

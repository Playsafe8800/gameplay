import { Logger } from '../../../newLogger';
import { TableStartData } from '../../../objectModels';
import { round } from '../../gameplay/round';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';

export class CardTossToChooseDealer extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`cardTossToChooseDealer`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.cardTossToChooseDealerProcess(job),
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

  private getJobId(tableId: string) {
    return `${tableId}:${Date.now()}`;
  }

  readonly addCardTossToChooseDealer = async (tableId: string) => {
    try {
      const timer = 2000;
      Logger.info(
        `Adding To Queue addCardTossToChooseDealer ${tableId}, ${timer}`,
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
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError addCardTossToChooseDealerQueue ${tableId} ${error.message}`,error
      );
    }
  };

  private readonly cardTossToChooseDealerProcess = async (job: any) => {
    try {
      Logger.info(
        'cardTossToChooseDealerProcess scheduler processed: ',
        [job.data],
      );
      // start processing here
      await round.startRoundToSendCards(job.data.tableId);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError cardTossToChooseDealerProcess', [error, job]);
      throw error
    }
  };

  readonly cancelAddCardTossToChooseDealer = async (
    tableId: string,
  ) => {
    const jobId = this.getJobId(tableId);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
        // process here
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelAddCardTossToChooseDealer ${jobId} => ${error.message}`,
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

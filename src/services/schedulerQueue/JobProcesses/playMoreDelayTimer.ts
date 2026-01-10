import { Logger } from '../../../newLogger';
import playMore from '../../../services/playMore';
import { Initializer } from '../init';
import { Worker } from "bullmq";
import { createInstrumentedWorker } from '../instrumentedWorker';


export class PlayMoreDelay extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`playMoreDelay`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.playMoreDelayProcess(job),
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
    return `${tableId}:playMore`;
  }

  readonly addPlayMoreDelay = async (
    tableId: string,
    tableInfo: any,
    players: any,
    finalDataGrpc: any,
    tableConfigData: any,
  ) => {
    const timer = 10000;
    try {
      Logger.info(
        `Adding To Queue addPlayMoreDelay ${tableId}, ${timer}`,
      );
      const jobId = this.getJobId(tableId);
      const dataPlayMoreDelayQueue: any = {
        tableId,
        tableInfo,
        players,
        finalDataGrpc,
        tableConfigData,
      };
      await this.Queue.add(this.Queue.name, dataPlayMoreDelayQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError playMoreDelayQueue ${tableId} ${error.message}`, error);
    }
  };

  private readonly playMoreDelayProcess = async (job: any) => {
    try {
      Logger.info('playMoreDelayProcess scheduler processed: ', [
        job.data,
      ]);
      // start processing here
      await playMore.checkPlayAgainAndUpsellData(
        job.data.tableId,
        job.data.tableInfo,
        job.data.players,
        job.data.finalDataGrpc,
        job.data.tableConfigData,
      );
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError playMoreDelayProcess', [error, job]);
      throw error
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

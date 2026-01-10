import { Logger } from '../../../newLogger';
import { PlayerTurnTimerData } from '../../../objectModels';
import { onTurnExpire } from '../../gameplay/turn';
import { Initializer } from '../init';
import { Worker } from "bullmq";
import { createInstrumentedWorker } from '../instrumentedWorker';


export class PlayerTurnTimer extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`playerTurnTimer`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.playerTurnTimerProcess(job),
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

  private getJobId(tableId: string, userId: number) {
    return `${tableId}:${userId}:TURN`;
  }

  readonly addPlayerTurnTimer = async (
    tableId: string,
    userId: number,
    timer: number,
  ) => {
    try {
      Logger.info(
        `Adding To Queue playerTurnTimer ${tableId}, ${timer}`,
      );
      const jobId = this.getJobId(tableId, userId);
      const dataTableStartQueue: PlayerTurnTimerData = {
        tableId,
        userId,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError playerTurnTimerQueue ${tableId} ${error.message}`,error
      );
    }
  };

  private readonly playerTurnTimerProcess = async (job: any) => {
    try {
      Logger.info('playerTurnTimerProcess scheduler processed: ', [
        job.data,
      ]);
      await onTurnExpire(job.data);
      // start processing here
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError playerTurnTimerProcess', [error, job]);
      throw error
    }
  };

  readonly cancelPlayerTurnTimer = async (
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
        `INTERNAL_SERVER_ERROR SchedulerError cancelPlayerTurnTimer ${jobId} => ${error.message}`,
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

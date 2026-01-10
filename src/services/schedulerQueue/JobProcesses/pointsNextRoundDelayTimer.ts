import { Logger } from '../../../newLogger';
import { winnerPoints } from '../../../services/finishEvents/winnerPoints';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';


export class PointsNextRoundTimerStart extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`pointsNextRoundTimerStart`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.pointsNextRoundTimerStartProcess(job),
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
  private getJobId(tableId: string, currentRound: number) {
    return `${tableId}:${currentRound}`
  }
  readonly addPointsNextRoundTimerStart = async (
    tableId: string,
    currentRound: number,
  ) => {
    const delayTimer = 1000;
    Logger.info(
      `Adding To Queue addPointsNextRoundTimerStart ${tableId}, ${delayTimer}`,
    );
    const jobId = this.getJobId(tableId,currentRound);
    try {
      const dataTableStartQueue = {
        tableId,
        currentRound,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: delayTimer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError pointsNextRoundTimerStartQueue ${jobId} ${error.message}`,error
      );
    }
  };
  private readonly pointsNextRoundTimerStartProcess = async (job: any) => {
    try {
      Logger.info(
        'pointsNextRoundTimerStartProcess scheduler processed: ',
        [job.data],
      );
      await winnerPoints.setupNextRoundPoints(job.data.tableId);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError pointsNextRoundTimerStartProcess', [error, job]);
      throw error
    }
  };
  readonly cancelPointsNextRoundTimerStart = async (
    tableId: string,
    currentRound: number
  ) => {
    const jobId = this.getJobId(tableId, currentRound);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelPointsNextRoundTimerStart ${jobId} => ${error.message}`,
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

import { Logger } from '../../../newLogger';
import { winner } from '../../finishEvents/winner';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';

export class RoundTimerStart extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`roundTimerStart`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.roundTimerStartProcess(job),
      {
        connection: this.Queue.opts.connection,
        prefix: (this.Queue as any).opts.prefix,
        ...this.workerOpts,
      }
    );
    this.worker.on('error', (err) => {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`, [err]);
    });
  }

  private getJobId(tableId: string, currentRound: number) {
    return `${tableId}:${currentRound}`;
  }

  readonly addRoundTimerStart = async (
    tableId: string,
    currentRound: number,
    nextRoundTimer: number,
    eliminatedPlayers: any,
    isTableRejoinable: boolean,
  ) => {
    const delayTimer = 3000;
    Logger.info(
      `Adding To Queue addRoundTimerStart ${tableId}, ${delayTimer}, ${nextRoundTimer}`,
    );
    const jobId = this.getJobId(tableId, currentRound);
    try {
      const dataTableStartQueue = {
        tableId,
        currentRound,
        nextRoundTimer,
        eliminatedPlayers,
        isTableRejoinable,
      };

      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: delayTimer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError roundTimerStartQueue ${jobId} ${error.message}`, [error]);
    }
  };

  private readonly roundTimerStartProcess = async (job: any) => {
    try {
      Logger.info('roundTimerStartProcess scheduler processed: ', [
        job.data,
      ]);
      const {
        nextRoundTimer,
        tableId,
        currentRound,
        eliminatedPlayers,
        isTableRejoinable,
      } = job.data;
      await winner.handleRoundTimerExpired({
        nextRoundTimer,
        tableId,
        currentRound,
        eliminatedPlayers,
        isTableRejoinable,
      });
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError roundTimerStartProcess', [error, job]);
      throw error
    }
  };

  readonly cancelRoundTimerStart = async (tableId: string, currentRound: number) => {
    const jobId = this.getJobId(tableId, currentRound);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelRoundTimerStart ${jobId} => ${error.message}`,
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

import { Logger } from '../../../newLogger';
import { InitialTurnSetup } from '../../../objectModels';
import { round } from '../../../services/gameplay/round';
import { Initializer } from '../init';
import { Worker } from "bullmq";
import { createInstrumentedWorker } from '../instrumentedWorker';

export class InitialTurnSetupTimer extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`initialTurnSetupTimer`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.initialTurnSetupTimerProcess(job),
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
    return `${tableId}:${currentRound}:INITIAL`;
  }

  readonly addInitialTurnSetupTimer = async (
    params: InitialTurnSetup,
    timer: number,
  ) => {
    try {
      Logger.info(
        `Adding To Queue addInitialTurnSetupTimer ${params?.tableId}, ${timer}`,
      );
      const jobId = this.getJobId(params.tableId, params.roundNumber);

      await this.Queue.add(this.Queue.name, params, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError initialTurnSetupQueue ${params?.tableId} ${error.message}`,
      );
    }
  };

  private readonly initialTurnSetupTimerProcess = async (job: any) => {
    try {
      Logger.info(
        'initialTurnSetupTimerProcess scheduler processed: ',
        [job.data],
      );
      const { tableId, roundNumber, nextTurn, userIds } = job.data;

      await round.setupInitialTurn(
        tableId,
        roundNumber,
        nextTurn,
        userIds,
      );
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError initialTurnSetupTimerProcess', [error, job]);
      throw error
    }
  };

  readonly cancelInitialTurnSetupTimer = async (
    tableId: string,
    roundNumber: number,
  ) => {
    const jobId = this.getJobId(tableId, roundNumber);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
        // process here
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelinitialTurnSetupTimer ${jobId} => ${error.message}`,
        error,
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

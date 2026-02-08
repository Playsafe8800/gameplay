import { Logger } from '../../../newLogger';
import { kickEliminatedUsers } from '../../../services/leaveTable/kickEliminatedUsers';
import { Initializer } from '../init';
import { Worker } from "bullmq";
import { createInstrumentedWorker } from '../instrumentedWorker';


export class KickEliminatedUsers extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`kickEliminatedUsers`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.kickEliminatedUsersProcess(job),
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
    return `${tableId}:kicked`;
  }

  readonly addKickEliminatedUsers = async (
    timer: number,
    tableId: string,
    eliminatedPlayers: any,
  ) => {
    Logger.info(
      `Adding To Queue addKickEliminatedUsers ${tableId}, ${timer}`,
    );
    const jobId = this.getJobId(tableId);
    try {
      const dataTableStartQueue = {
        tableId,
        eliminatedPlayers,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError kickEliminatedUsersQueue ${jobId} ${error.message}`,error
      );
    }
  };

  private readonly kickEliminatedUsersProcess = async (job: any) => {
    try {
      Logger.info(
        'kickEliminatedUsersProcess scheduler processed: ',
        [job.data],
      );
      const { tableId, eliminatedPlayers } = job.data;
      await kickEliminatedUsers(tableId, eliminatedPlayers);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError kickEliminatedUsersProcess', [error, job]);
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

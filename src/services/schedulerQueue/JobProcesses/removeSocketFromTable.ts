import { Logger } from '../../../newLogger';
import { socketOperation } from '../../../socketHandler/socketOperation';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';


export class RemoveSocketFromTable extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`removeSocketFromTable`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.removeSocketFromTable(job),
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

  private getJobId(tableId: string, socketId: string) {
    return `${tableId}:${socketId}`;
  }

  readonly addRemoveSocketFromTable = async (
    timer: number,
    tableId: string,
    socketId: string,
  ) => {
    Logger.info(
      `Adding To Queue addRemoveSocketFromTable ${tableId}, ${timer}, ${socketId}`,
    );
    const jobId = this.getJobId(tableId, socketId);
    try {
      const dataTableStartQueue = {
        tableId,
        socketId,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError addRemoveSocketFromTable ${jobId} ${error.message}`,error
      );
    }
  };

  private readonly removeSocketFromTable = async (job: any) => {
    try {
      Logger.info('removeSocketFromTable scheduler processed: ', [
        job.data,
      ]);
      const { tableId, socketId } = job.data;
      await socketOperation.removeClientFromRoom(tableId, socketId);
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError removeSocketFromTable', [error, job]);
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

import { Logger } from '../../../newLogger';
import { PlayerGameplay } from '../../../objectModels/playerGameplay';
import { winner } from '../../finishEvents/winner';
import { Initializer } from '../init';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';

export class ScoreBoard extends Initializer {
  private worker: Worker<PlayerGameplay>;
  constructor() {
    super(`scoreBoard`);
    this.worker = createInstrumentedWorker<PlayerGameplay>(
      this.Queue.name,
      (job) => this.scoreBoardProcess(job),
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

  private getJobId(tableId: string) {
    return `${tableId}:SCB`;
  }

  readonly addScoreBoard = async (
    tableId: string,
    currentRound: number,
    playingPlayers: Array<PlayerGameplay | null>,
    grpcResponse: any,
    isNewGameTableUI?: boolean,
    isPointsRummy?: boolean,
  ) => {
    const timer = isNewGameTableUI ? 2000 : 4000;
    try {
      Logger.info(
        `Adding To Queue addScoreBoard ${tableId}, ${timer} , grpc is ${JSON.stringify(
          grpcResponse,
        )}`,
      );
      const jobId = this.getJobId(tableId);
      const dataTableStartQueue = {
        tableId,
        currentRound,
        playingPlayers,
        grpcResponse,
        isPointsRummy,
      };
      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError scoreBoardQueue ${tableId} ${error.message}`);
    }
  };

  private readonly scoreBoardProcess = async (job: any) => {
    try {
      Logger.info('scoreBoardProcess scheduler processed: ', [
        job.data,
      ]);
      const { tableId, currentRound, isPointsRummy, grpcResponse } =
        job.data;
      // start processing here
      await winner.showScoreboard(
        tableId,
        currentRound,
        grpcResponse,
        isPointsRummy,
      );
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError scoreBoardProcess', [error, job]);
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

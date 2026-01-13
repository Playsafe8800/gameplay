import { Logger } from '../../../newLogger';
import { addbotTurnI } from '../../../objectModels';
import { Initializer } from '../init';
import { pickFromClosedDeck } from '../../../services/moves/pickFromClosedDeck';
import { scheduler } from '../index';
import {
  BOT_CONFIG,
  GAME_END_REASONS,
  NUMERICAL,
  RUMMY_TYPES,
  TABLE_STATE,
} from '../../../constants';
import { tableConfigurationService } from '../../../db/tableConfiguration';
import { tableGameplayService } from '../../../db/tableGameplay';
import { playerGameplayService } from '../../../db/playerGameplay';
import { dropGame } from '../../../services/finishEvents/dropGame';
import { pickFromOpenDeck } from '../../../services/moves/pickFromOpenDeck';
import userServiceExt from '../../../userService';
import { cardHandler } from '../../gameplay/cardHandler';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';

export class BotTurn extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`botTurn`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.addBotTurnProcess(job),
      {
        connection: this.Queue.opts.connection,
        prefix: `{${this.Queue.name}}`,
        ...this.workerOpts,
      },
    );
    this.worker.on('error', (err) => {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError on queue ${this.Queue.name}:`,
        [err],
      );
    });
  }

  private getJobId(tableId: string, userId: number) {
    return `${tableId}:${userId}:botTurn`;
  }

  readonly addBotTurn = async (
    tableId: string,
    userId: number,
    botTurnCount: number,
    timer: number,
  ) => {
    try {
      Logger.info(`Adding To Queue addBotTurn ${tableId}, ${timer}`);
      const jobId = this.getJobId(tableId, userId);
      const dataTableStartQueue: addbotTurnI = {
        tableId,
        userId,
        botTurnCount,
      };

      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options,
      });
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError AddBotTurnQueue ${tableId} ${error.message}`,
      );
    }
  };

  private readonly addBotTurnProcess = async (job: any) => {
    try {
      Logger.info('addBotTurnProcess scheduler processed: ', [
        job.data,
      ]);
      const { tableId, userId, botTurnCount } = job.data;
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound', 'maximumSeat', 'gameType'],
        );

      if (!tableConfigData) {
        throw new Error(`Table data is not set correctly ${tableId}`);
      }
      const tableGameData =
        await tableGameplayService.getTableGameplay(
          tableId,
          tableConfigData.currentRound,
          ['tableState', 'trumpCard', 'opendDeck', 'isFirstTurn'],
        );

      if (!tableGameData)
        throw new Error(`TableGamePlay not found, ${tableId}`);

      if (tableGameData.tableState !== TABLE_STATE.ROUND_STARTED) {
        return;
      }

      const playerGamePlayData =
        await playerGameplayService.getPlayerGameplay(
          userId,
          tableId,
          tableConfigData.currentRound,
          ['currentCards', 'groupingCards', 'isFirstTurn', 'turnCount'],
        );

      if (!playerGamePlayData)
        throw new Error(`playerGamePlay not found, ${tableId}`);

      if (playerGamePlayData.currentCards.length > 13)
        throw new Error(
          `Invalid currentcards, ${tableId} ${playerGamePlayData.currentCards} ${tableConfigData.currentRound}`,
        );

      if (
        playerGamePlayData.turnCount === 0 &&
        (tableConfigData.gameType === RUMMY_TYPES.POOL ||
          tableConfigData.gameType === RUMMY_TYPES.POINTS)
      ) {
        const cohorts = BOT_CONFIG.DROP_COHORT.split(",")
        const { shouldDrop, groupCards } = await userServiceExt.drop(
          playerGamePlayData.currentCards,
          tableGameData.trumpCard,
          // @ts-ignore
          cohorts.map((e: number) => {
            e = Number(e);
            return e;
          }),
          tableGameData.opendDeck[tableGameData.opendDeck.length - 1],
          tableConfigData.maximumSeat === 2 ? 1 : 2,
          tableId,
        );
        if (shouldDrop) {
          const { score: points, meld } =
            cardHandler.groupCardsOnMeld(
              groupCards,
              tableGameData.trumpCard,
              tableConfigData.maximumPoints,
            );
          playerGamePlayData.groupingCards = groupCards;
          playerGamePlayData.meld = meld;
          playerGamePlayData.points = points;
          await playerGameplayService.setPlayerGameplay(
            playerGamePlayData.userId,
            tableId,
            tableConfigData.currentRound,
            playerGamePlayData,
          );
          await dropGame(
            { tableId },
            { userId },
            GAME_END_REASONS.DROP,
          );
          return job.data;
        }
      }
      const isPickFromOpenDeck = await userServiceExt.pick(
        playerGamePlayData.currentCards,
        tableGameData.opendDeck[tableGameData.opendDeck.length - 1],
        tableGameData.trumpCard,
        playerGamePlayData.isFirstTurn,
        tableId,
      );

      if (isPickFromOpenDeck) {
        await pickFromOpenDeck(
          { tableId },
          { userId },
          {
            eventID: 9,
            timeStamp: Date.now().toString(),
            retryCount: 1,
          },
          true,
        );
      } else {
        await pickFromClosedDeck(
          { tableId },
          { userId },
          {
            eventID: 9,
            timeStamp: Date.now().toString(),
            retryCount: 1,
          },
          true,
        );
      }

      const ran = Math.floor(
        Math.random() * (NUMERICAL.SIX - NUMERICAL.TWO + 1) +
          NUMERICAL.TWO,
      );

      await scheduler.addJob.botThrow(
        tableId,
        userId,
        Math.ceil(NUMERICAL.TWENTY / ran) * NUMERICAL.THOUSAND,
      );

      return job.data;
    } catch (error) {
      Logger.error(
        'INTERNAL_SERVER_ERROR SchedulerError addBotTurnProcess',
        [error, job],
      );
      throw error;
    }
  };

  readonly cancelBotTurn = async (
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
        `INTERNAL_SERVER_ERROR SchedulerError cancelBotTurn ${jobId} => ${error.message}`,
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
  };
}

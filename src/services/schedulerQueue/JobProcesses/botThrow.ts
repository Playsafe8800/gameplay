import { Logger } from '../../../newLogger';
import { addbotThrowI } from '../../../objectModels';
import { Initializer } from '../init';
import { tableConfigurationService } from '../../../db/tableConfiguration';
import { playerGameplayService } from '../../../db/playerGameplay';
import { throwCard } from '../../../services/moves/throwCard';
import { cardHandler } from '../../../services/gameplay/cardHandler';
import { tableGameplayService } from '../../../db/tableGameplay';
import { scheduler } from '../index';
import {
  CURRENCY_TYPE,
  LEAVE_TABLE_REASONS,
  NUMERICAL, PLAYER_STATE,
  TABLE_STATE
} from "../../../constants";
import LeaveTableHandler from '../../../services/leaveTable';
import userServiceExt from '../../../userService';
import { userProfileService } from '../../../db/userProfile';
import { Worker } from 'bullmq';
import { createInstrumentedWorker } from '../instrumentedWorker';

export class BotThrow extends Initializer {
  private worker: Worker<any>;
  constructor() {
    super(`botThrow`);
    this.worker = createInstrumentedWorker<any>(
      this.Queue.name,
      (job) => this.addBotThrowProcess(job),
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

  private getJobId(tableId: string, userId: number) {
    return `${tableId}:${userId}:botThrow`;
  }

  readonly addBotThrow = async (
    tableId: string,
    userId: number,
    timer: number,
  ) => {
    try {
      Logger.info(`Adding To Queue addBotThrow ${tableId}, ${timer}`);
      const jobId = this.getJobId(tableId, userId);
      const dataTableStartQueue: addbotThrowI = {
        tableId,
        userId,
      };

      await this.Queue.add(this.Queue.name, dataTableStartQueue, {
        delay: timer,
        jobId,
        ...this.options
      })
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR SchedulerError AddBotThrowQueue ${tableId} ${error.message}`, [error]);
    }
  };

  private readonly addBotThrowProcess = async (job: any) => {
    try {
      Logger.info('addBotThrowProcess scheduler processed: ', [
        job.data,
      ]);
      const { tableId, userId } = job.data;
      const tableConfig =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            'currentRound',
            'maximumPoints',
            'userTurnTimer',
            'maximumSeat',
            'currencyType',
          ],
        );
      const { currentRound } = tableConfig;

      const tableGameData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          [
            'trumpCard',
            'closedDeck',
            'opendDeck',
            'tableState',
            'currentTurn',
            'seats',
          ],
        );

      if (tableGameData?.currentTurn !== userId) return false;

      if (
        tableGameData &&
        tableGameData.tableState !== TABLE_STATE.ROUND_STARTED
      ) {
        await LeaveTableHandler.main(
          {
            tableId,
            isDropNSwitch: true,
            reason: LEAVE_TABLE_REASONS.ELIMINATED,
          },
          userId,
        );
        return;
      }

      const playerGamePlay =
        await playerGameplayService.getPlayerGameplay(
          userId,
          tableId,
          currentRound,
          ['userId', 'currentCards', 'groupingCards'],
        );
      let rejectedCards = [],
        pickedCards = [],
        opponentProfitLoss = 0;

      if (tableConfig.maximumSeat === 2) {
        const opponentId = tableGameData.seats.find(
          (element) => element._id !== userId,
        )?._id;

        const [oppoPlayerGamePlay, opponentProfile] =
          await Promise.all([
            playerGameplayService.getPlayerGameplay(
              opponentId,
              tableId,
              currentRound,
              ['rejectedCards', 'pickedCards'],
            ),
            userProfileService.getUserDetailsById(opponentId),
          ]);
        rejectedCards = oppoPlayerGamePlay.rejectedCards;
        pickedCards = oppoPlayerGamePlay.pickedCards;
        opponentProfitLoss = opponentProfile?.profitLoss || 0;
      } else {
        await Promise.all(
          tableGameData.seats.map(async (e) => {
            const profile =
              await userProfileService.getUserDetailsById(e._id);
            if (!profile?.isBot){
              const oppoPlayerGamePlay = await playerGameplayService.getPlayerGameplay(
                e._id,
                tableId,
                currentRound,
                ['rejectedCards', 'pickedCards', 'userStatus'],
              );
              if (oppoPlayerGamePlay.userStatus === PLAYER_STATE.PLAYING){
                if (opponentProfitLoss <= 0) opponentProfitLoss = profile?.profitLoss || 0;
                rejectedCards = rejectedCards.concat(
                  oppoPlayerGamePlay.rejectedCards,
                );
                pickedCards = pickedCards.concat(oppoPlayerGamePlay.pickedCards);
              }
            }
          }),
        );
      }

      if (playerGamePlay && tableGameData) {
        const decCount = tableConfig.maximumSeat === 2 ? 1 : 2;
        const { thrownCard, isRummy, groupCards } =
          await userServiceExt.throw(
            playerGamePlay.currentCards,
            tableGameData.trumpCard,
            decCount,
            tableGameData.opendDeck,
            tableId,
            tableConfig.currencyType === CURRENCY_TYPE.COINS
              ? undefined
              : opponentProfitLoss > 0
                ? rejectedCards
                : undefined,
            tableConfig.currencyType === CURRENCY_TYPE.COINS
              ? undefined
              : opponentProfitLoss > 0
                ? pickedCards
                : undefined,
          );
        const currentCard = groupCards.flat().filter((e) => e);
        const { score: points, meld } = cardHandler.groupCardsOnMeld(
          groupCards,
          tableGameData.trumpCard,
          tableConfig.maximumPoints,
        );
        playerGamePlay.currentCards = currentCard;
        playerGamePlay.groupingCards = groupCards;
        playerGamePlay.meld = meld;
        playerGamePlay.points = points;
        playerGamePlay.isBotWinner = true;
        playerGamePlay.groupingCards[playerGamePlay.groupingCards.length -1].push(thrownCard);
        playerGamePlay.currentCards.push(thrownCard);
        await playerGameplayService.setPlayerGameplay(
          playerGamePlay.userId,
          tableId,
          currentRound,
          playerGamePlay,
        );

        if (isRummy) {
          await cardHandler.declareCard(
            {
              group: groupCards,
              tableId,
              card: thrownCard,
            },
            { userId },
            {
              eventID: 9,
              timeStamp: Date.now().toString(),
              retryCount: 1,
            },
          );

          const ran = Math.floor(
            Math.random() * (NUMERICAL.SIX - NUMERICAL.TWO + 1) +
              NUMERICAL.TWO,
          );

          await scheduler.addJob.botFinish(
            tableId,
            userId,
            Math.ceil(tableConfig.userTurnTimer / ran) *
              NUMERICAL.THOUSAND,
            groupCards,
          );
        } else if (thrownCard) {
          await throwCard(
            { tableId, card: thrownCard, group: groupCards },
            { userId },
            {
              eventID: 9,
              timeStamp: Date.now().toString(),
              retryCount: 1,
            },
            true,
          );
        } else {
          Logger.error(
            `INTERNAL_SERVER_ERROR ${tableId} ${userId} ${currentRound} WRONG_OUTPUT_BOT_SERVICE ${thrownCard}`,
          );
        }
      } else {
        Logger.error(
          `INTERNAL_SERVER_ERROR ${tableId} ${userId} ${currentRound} pgp not found`,
        );
      }
      return job.data;
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR SchedulerError addBotThrowProcess', error, job);
      throw error
    }
  };

  readonly cancelBotThrow = async (
    tableId: string,
    userId: number,
  ) => {
    const jobId = this.getJobId(tableId, userId);
    try {
      const job = await this.Queue.getJob(jobId);
      if (job) {
        await job.remove();
        // process here
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR SchedulerError cancelBotThrow ${jobId} => ${error.message}`,
        error,
      );
    }
  };

  private async getPickedCard(
    currentCards: Array<string>,
    trumpCard: string,
  ) {
    return this.selectAndRemoveNonTrumpCard(currentCards, trumpCard);
  }

  private selectAndRemoveNonTrumpCard(
    currentCards: Array<string>,
    trumpCard: string,
  ): string {
    const nonTrumpCards = currentCards.filter((c) => {
      const [rank, suit] = c.split('-');
      const [trumpRank, trumpSuit] = trumpCard.split('-');
      return (
        suit !== trumpSuit && rank !== trumpRank && c !== 'J-1-0'
      );
    });
    const card = nonTrumpCards.pop() || currentCards.pop() || '';

    const index = currentCards.indexOf(card);
    if (index > -1) {
      currentCards.splice(index, 1);
    }
    return card;
  }

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

import { Logger } from '../../newLogger';
import { playerGameplayService } from '../../db/playerGameplay/index';
import { roundScoreBoardService } from '../../db/roundScoreBoard/index';
import { tableConfigurationService } from '../../db/tableConfiguration/index';
import { tableGameplayService } from '../../db/tableGameplay/index';
import { userProfileService } from '../../db/userProfile/index';
import { scheduler } from '../schedulerQueue/index';
import UserService from '../../userService';

class DumpGame {
  async dumpGame(tableId: string, isFinalRound?: boolean) {
    try {
      Logger.debug(`dumpGame started :- ${tableId}`);
      // UserService.cancelBattle(tableId);
      const tableConfig =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound'],
        );


      Logger.debug(`dumpGame: tableConfig: `, tableConfig);

      if (tableConfig && tableConfig.currentRound) {
        const { currentRound } = tableConfig;
        const totalRound = Array.from(Array(currentRound).keys()).map(
          (e) => e + 1,
        );

        const tableGamePlay =
          await tableGameplayService.getTableGameplay(
            tableId,
            currentRound,
            ['seats'],
          );
        Logger.debug(`dumpGame: ${tableId}, TGP: `, tableGamePlay);
        await Promise.all([
          totalRound.map((roundNumber) => {
            roundScoreBoardService.deleteRoundScoreBoard(
              tableId,
              roundNumber,
            ),
              tableGameplayService.deleteTableGameplay(
                tableId,
                roundNumber,
              );
            return true;
          }),
          tableConfigurationService.deleteTableConfiguration(tableId),
        ]);

        if (
          tableGamePlay &&
          tableGamePlay.seats &&
          tableGamePlay.seats.length
        ) {
          Logger.debug(
            `dumpGame: ${tableId}, seats: `,
            tableGamePlay.seats,
          );
          const seats = tableGamePlay.seats.filter((ele) => ele._id);
          const userIds = seats.map((e) => e._id);

          if (isFinalRound) {
            userIds.forEach((userId) => {
              Logger.debug(
                `cancelling job for user : - ${userId}  for table ${tableId}`,
              );
              scheduler.cancelJob.playerTurnTimer(tableId, userId);
              scheduler.cancelJob.finishTimer(tableId, currentRound);
            });
          }

          const playerGamePlays: Array<any> = [];
          const userProfiles: Array<any> = [];
          for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            for (let j = 1; j < totalRound.length + 1; j++) {
              playerGamePlays.push(
                playerGameplayService.deletePlayerGamePlay(
                  userId,
                  tableId,
                  currentRound,
                ),
              );
              userProfiles.push(
                userProfileService.removeTableIdFromProfile(
                  userId,
                  tableId,
                ),
              );
            }
          }

          await Promise.all(playerGamePlays);
          await Promise.all(userProfiles);
          Logger.debug(`dump table ended :- ${tableId}`);
        }
      }
      return true;
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR dumpGame: for table `, [error]);
      return false;
    }
  }
}

export const dumpGameHelper = new DumpGame();

import { Logger } from '../../newLogger';
import { LEAVE_TABLE_REASONS } from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { userProfileService } from '../../db/userProfile';

export const kickEliminatedUsers = async (
  tableId: any,
  eliminatedPlayers: any,
) => {
  const LeaveTableHandler = (
    await import('../../services/leaveTable')
  ).default;

  const tableConfigData =
    await tableConfigurationService.getTableConfiguration(tableId, [
      'currentRound',
      'maximumPoints',
    ]);

  for (const user of eliminatedPlayers) {
    try {
      const userInfoObj = await userProfileService.getUserDetailsById(
        user.userId,
      );

      Logger.info('KICK_ELIMINATED_USERS', [
        userInfoObj,
        tableConfigData,
        user,
      ]);

      if (!userInfoObj || !tableConfigData) {
        Logger.error(
          `INTERNAL_SERVER_ERROR userInfo or tableConfig not found in kickEliminatedUsers >> `,
        );
      }

      const { currentRound, maximumPoints } = tableConfigData;

      const playerGamePlay: any =
        await playerGameplayService.getPlayerGameplay(
          user.userId,
          tableId,
          currentRound,
          ['dealPoint'],
        );

      if (playerGamePlay?.dealPoint < maximumPoints) {
        continue;
      }

      await LeaveTableHandler.main(
        {
          tableId,
          reason: LEAVE_TABLE_REASONS.ELIMINATED,
        },
        userInfoObj?.id || 0,
      );
    } catch (error: any) {
      Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR: kickEliminatedUsers: ', [
        tableId,
        eliminatedPlayers,
        error,
      ]);
    } finally {
      try {
        // lock release
      } catch (error: any) {
        Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: kickEliminatedUsers`, [
          tableId,
          eliminatedPlayers,
          error,
        ]);
      }
    }
  }
};

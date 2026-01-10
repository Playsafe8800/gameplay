import { Logger } from '../../newLogger';
import { LEAVE_TABLE_REASONS, PLAYER_STATE } from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import { SeatSchema } from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { CancelBattleError } from '../../utils/errors';
import { cancelBattle } from '../gameplay/cancelBattle';

export async function leaveDisconnectedUsers(
  tableId: string,
  currentRound: number,
) {
  try {
    Logger.info(
      `leaveDisconnectedUsers => tableId ${tableId}; currentRound ${currentRound} `,
    );
    const tableGamePlayData =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        ['seats'],
      );
    Logger.info(
      `leaveDisconnectedUsers ${tableId}:${currentRound} TGP`,
      [tableGamePlayData],
    );

    if (!tableGamePlayData) {
      throw new Error(
        `leaveDisconnectedUsers: 
        TableGamePlay not found, ${tableId}:${currentRound}`,
      );
    }

    const LeaveTableHandler = (
      await import('../../services/leaveTable')
    ).default;

    tableGamePlayData.seats.forEach(async (seat: SeatSchema) => {
      const [playerGamePlayData, userProfileData] = await Promise.all(
        [
          playerGameplayService.getPlayerGameplay(
            seat._id,
            tableId,
            currentRound,
            ['userStatus'],
          ),
          userProfileService.getUserDetailsById(seat._id),
        ],
      );

      Logger.info(
        `leaveDisconnectedUsers ${tableId}: ${seat._id} PGP`,
        [playerGamePlayData, `userProfileData: `, userProfileData],
      );

      if (
        !userProfileData ||
        !playerGamePlayData ||
        playerGamePlayData?.userStatus === PLAYER_STATE.LEFT
      )
        return;

      const socketInfo = await socketOperation.getSocketFromSocketId(
        userProfileData?.socketId,
      );
      if (socketInfo) return;

      LeaveTableHandler.main(
        {
          tableId,
          reason: LEAVE_TABLE_REASONS.DISCONNECTED_BEFORE_GAME_START,
        },
        seat._id,
      );
    });
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR _CATCH_ERROR_: Error from leaveDisconnectedUsers: `,
      [error],
    );
    if (error instanceof CancelBattleError) {
      cancelBattle.cancelBattle(tableId, error);
      return;
    }
    return undefined;
  }
}

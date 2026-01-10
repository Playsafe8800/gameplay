import { Logger } from '../../newLogger';
import {
  CONNECTION_TYPE,
  EVENTS,
  LEAVE_TABLE_REASONS,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { userProfileService } from '../../db/userProfile';
import { SwitchTableInput } from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { CancelBattleError } from '../../utils/errors';
import { cancelBattle } from '../gameplay/cancelBattle';
import { addTable } from '../signUp/addTable';

const insertPlayerInNewTable = async (
  currentTableId: string,
  userId: number,
  socket: any,
  tableSessionId = '',
) => {
  try {
    const [tabledataInfo, userProfile]: Array<any> =
      await Promise.all([
        tableConfigurationService.getTableConfiguration(
          currentTableId,
          ['lobbyId'],
        ),
        userProfileService.getUserDetailsById(userId),
      ]);

    Logger.info(
      `== User ${userId} InsertPlayerInNewTable after leave table for switchTable call old table: ${currentTableId} ==> `,
      [userProfile],
    );

    const gtiData = await addTable(
      {
        lobbyId: tabledataInfo.lobbyId,
        connectionType: CONNECTION_TYPE.ADD_TABLE,
        tableSessionId,
        unitySessionId: userProfile.unitySessionId,
      },
      socket,
    );

    Logger.info(
      `switchTable: after addTable: oldTableId: ${currentTableId}`,
      [gtiData],
    );
    const [response] = gtiData.gameTableInfoData;

    if (response) {
      response.referenceTableId = currentTableId;
      socketOperation.sendEventToClient(
        socket,
        response,
        EVENTS.SWITCH_TABLE_GTI_SOCKET_EVENT,
      );
      return response
    } else
      Logger.error(
        `INTERNAL_SERVER_ERROR switch table new GTI response undefined: lastTableId: ${currentTableId}`,
      );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR _CATCH_ERROR_: Error from insertPlayerInNewTable: ${error}`,
      [error],
    );
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(currentTableId, error);
    }
  }
};

export async function switchTable(
  data: SwitchTableInput,
  socket: any,
) {
  try {
    const { userId, tableId, isDropNSwitch } = data;

    const tableInfo =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
      ]);
    const { currentRound } = tableInfo;

    // get before leavetable because during waiting/roundTimer it will be destroyed
    const playerGamePlayInfo =
      await playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        ['tableSessionId'],
      );

    const LeaveTableHandler = (
      await import('../../services/leaveTable')
    ).default;
    const leaveTableSuccess = await LeaveTableHandler.main(
      {
        tableId,
        reason: LEAVE_TABLE_REASONS.SWITCH,
        isDropNSwitch,
      },
      userId,
    );

    if (leaveTableSuccess?.exit) {
      const pgp = await playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        ['isPlayAgain'],
      );
      if (pgp && !pgp.isPlayAgain) {
        const userInfo = await userProfileService.getUserDetailsById(
          userId,
        );
        if (!userInfo) {
          throw new Error(`UserDetails not found for: ${userId}`);
        }

        // const grpcRes = await grpcBattle.sendFinishUserSession({
        //   sessionId: playerGamePlayInfo?.tableSessionId, // userProfile.unitySessionId,
        //   userId,
        //   lobbyId: tableInfo.lobbyId,
        // });

        // Logger.info(
        //   `finishSessionGRPCCall in switchTable for userId: ${userInfo.id} -
        //     sessionId: ${playerGamePlayInfo?.tableSessionId} - ${userProfile.unitySessionId} -
        //     lobbyId: ${tableInfo.lobbyId}`,
        //   grpcRes,
        // );
        Logger.info(
          `User ${userId} has not valid amount, 
            hence not finding any new table after switchTable ${tableId}`,
          [pgp],
        );
        return false;
      }

      Logger.info(
        `== PGP for user ${userId} on previous table ${tableId} after leave table ==`,
        [pgp],
      );

      Logger.info(
        `=== user ${userId} leave Table from ${tableId} success, Inserting player in a new table ===`,
      );
      const resData = await insertPlayerInNewTable(
        tableId,
        userId,
        socket,
        playerGamePlayInfo?.tableSessionId,
      );
      return resData;
    } else {
      Logger.info(
        `user ${userId} Leave Table from ${tableId} Failed`,
      );
    }
    return { success: true, error: null, tableId };
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR _CATCH_ERROR_:  from switch table:  on table ${data?.tableId}`,
      [error],
    );
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(data?.tableId, error);
    }
    throw error;
  }
}

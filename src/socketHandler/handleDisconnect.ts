import { tableConfigurationService } from '../db/tableConfiguration';
import { userProfileService } from '../db/userProfile';
import { Logger } from '../newLogger';
import { leaveDisconnectedUsers } from '../services/leaveTable/leaveDisconnectedUsers';
export async function handleDisconnect(socket: any, error?: any) {
  Logger.info(
    `Handling disconnect: ${socket.id}, userId: ${socket?.userId}`,
    error,
  );
  try {
    if (socket?.userId) {
      // const userDetail = await userProfileService.getUserDetailsById(
      //   socket.userId,
      // );
      // const tableId = userDetail?.tableIds[0];
      // if (tableId) {
      //   Logger.info(`Lock acquired, in handleDisconnect `, [
      //     socket.userId,
      //     tableId,
      //   ]);
      //   const tableConfigData =
      //     await tableConfigurationService.getTableConfiguration(
      //       tableId, ["currentRound"]
      //     );
      //   if (!tableConfigData)
      //     throw new Error(
      //       `Table configuration not set for tableId ${tableId}`,
      //     );
      //   await leaveDisconnectedUsers(
      //     tableId,
      //     tableConfigData.currentRound,
      //   );
      // }
    }
  } catch (error) {
    Logger.error(`INTERNAL_SERVER_ERROR handleDisconnect:, ${socket?.userId}`, [error]);
  }
}

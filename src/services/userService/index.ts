import { Logger } from '../../newLogger';
import { EVENTS } from '../../constants';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import { SeatSchema } from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import userServiceExt from '../../userService';

class UserService {
  async findOrCreateUser(
    userId: number,
    socketId: string,
    socketHeaders: object,
    appType: string,
    unitySessionId?: string,
  ) {
    // Get user data from GRPC
    const userData =
      await userProfileService.getOrCreateUserDetailsById(
        userId,
        socketId,
        socketHeaders,
        unitySessionId,
        appType,
      );
    return userData;
  }

  async debitValidation(
    tableId: string,
    lobbyId: number,
    newUserId: number,
  ) {
    try {
      Logger.info('debitValidation for tableId on new userId: ', [
        tableId,
        newUserId,
      ]);
      const tableData =
        await tableConfigurationService.getTableConfiguration(
          tableId, ["currentRound"]
        );
      const { currentRound, cgsClusterName } = tableData;
      const tableGameData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ["seats"]
        );
      if (!tableGameData) {
        throw new Error(
          'tableGameData not found while debitValidation',
        );
      }
      const filteredSeats: SeatSchema[] = tableGameData.seats.filter(
        (seat: SeatSchema) => seat._id,
      );
      const userIds: number[] = filteredSeats.map((seat) => seat._id);
      userIds.push(newUserId);
      const LeaveTableHandler = (
        await import('../../services/leaveTable')
      ).default;
      // userIds.map(async (userId: number) => {
      // const res = await grpcUserDetails.verifyPlayerEligibility({
      //   userId: userId,
      //   lobbyId,
      //   activeTableDetails: {
      //     activeTableId: '',
      //     activeTablePresent: false,
      //   },
      //   flowType: '',
      //   cgsClusterName,
      // });

      // if (res && !res.playerEligible) {
      //   await sendInsufficientFundEvent(userId, tableId);
      //   await LeaveTableHandler.main(
      //     {
      //       reason: LEAVE_TABLE_REASONS.DEBIT_VALIDATION_FAILED,
      //       tableId,
      //     },
      //     userId,
      //   );
      // }
      // if (res && res.error) {
      //   Logger.info(
      //     'INTERNAL_SERVER_ERROR checkPlayerEligibility error for userId: ',
      //     userId,
      //     res.error,
      //   );
      // }
      // });
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR debitValidation catch block error: ', [error]);
      throw error;
    }
  }

  async getUserBalance(
    userId: number,
    socket: any,
    token: string,
    ack?: any,
  ) {
    try {
      if (!userId)
        throw new Error('userId required for getUserBalance');
      if (!token) {
        const profileData =
          await userProfileService.getUserDetailsById(userId);
        if (profileData?.token) token = profileData?.token;
      }
      if (token) {
        const userBalanceRes = await userServiceExt.getUserWallet(
          token,
        );
        const totalBalance =
          userBalanceRes?.depositBalance +
          userBalanceRes?.winningBalance;
        const response = {
          depositBalance: userBalanceRes?.depositBalance,
          bonusBalance: userBalanceRes?.bonusBalance,
          winningBalance: userBalanceRes?.winningBalance,
          withDrawableBalance: userBalanceRes?.winningBalance,
          pointsWalletBalance: 100,
          totalBalance,
          totalDummyBalance: 1210,
          success: true,
        };
        if (ack) return response;
        await socketOperation.sendEventToClient(
          socket,
          response,
          EVENTS.USER_BALANCE_SOCKET_EVENT,
        );
      }
    } catch (error) {
      Logger.error('INTERNAL_SERVER_ERROR getUserBalance catch block error: ', [error]);
      const response = {
        success: false,
        error: error,
      };
      return response;
    }
  }
}

export const userService = new UserService();

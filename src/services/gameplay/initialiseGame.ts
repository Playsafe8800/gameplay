import { Logger } from '../../newLogger';
import _ from 'underscore';
import { zk } from '../../connections';
import { playerGameplayService } from '../../db/playerGameplay/index';
import { removeOnGrpcSuccessFalse } from '../../utils/removeOnGrpcSuccessFalse';
import userServiceExt from '../../userService';
import { LEAVE_TABLE_REASONS } from '../../constants';

class InitialiseGame {
  async createBattle(
    tableId: string,
    playingUsers: Array<any>,
    tableConfigData: any,
  ) {
    let grpcRes;
    const userIds = _.compact(playingUsers).map((e) => {
      return e['playingUser'].userId;
    });
    try {
      Logger.info(`create battle ${tableId} > sessionIds >> `, {
        usersId: userIds,
        lobbyId: tableConfigData.lobbyId,
        matchId: tableId,
      });

      grpcRes = await userServiceExt.createBattle(
        userIds,
        tableConfigData.lobbyId,
        tableId,
      );
      Logger.info(
        `create battle response ${tableId} > sessionIds >> `,
        [grpcRes],
      );
      if (grpcRes && grpcRes.status) {
        return {
          tableGameData: {
            seats: playingUsers.map((user) => ({
              _id: user['playingUser']._id,
              seat: user['playingUser'].seat,
              seatIndex: user['playingUser'].seat,
            })),
          },
        };
      } else {
        return false;
      }
    } catch (error) {
      await this.removeInsuficientFundUser(userIds, tableConfigData, grpcRes)
      Logger.error('INTERNAL_SERVER_ERROR Error in createBattle func ', [error]);
      throw error;
    }
  }

  async removeInsuficientFundUser(
    userIds: Array<any>,
    tableConfigData: any,
    grpcRes: any,
  ) {
    try {
      Logger.info(`removeInsuficientFundUser: ${tableConfigData._id}`, [grpcRes, userIds]);
      const errMsg = zk.getConfig().GSDM;

      const lbPlayingUsers = (
        await Promise.all(
          userIds.map((userId: any) => {
              return playerGameplayService.getPlayerGameplay(
                userId,
                tableConfigData._id,
                tableConfigData.currentRound,
                ['userId'],
              );
          }),
        )
      ).filter(Boolean);
      Logger.info(`lbPlayingUser >>>>`, [tableConfigData._id, lbPlayingUsers]);
      await removeOnGrpcSuccessFalse(
        tableConfigData,
        lbPlayingUsers,
        errMsg,
        LEAVE_TABLE_REASONS.NO_BALANCE
      );

      return true
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR on removeInsuficientFundUser: ${tableConfigData}`, [
        error.message,
        tableConfigData,
        error,
      ]);
    }
  }
}

export const initializeGame = new InitialiseGame();

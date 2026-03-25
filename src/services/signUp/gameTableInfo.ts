import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import {
  CONFIG,
  NUMERICAL,
  PLAYER_STATE,
  POINTS,
  TABLE_STATE,
} from '../../constants';
import { POOL_TYPES } from '../../constants/poolTypes';
import { tableConfigurationService } from '../../db/tableConfiguration';
import {
  GameTableInfo as GameTableInfoInterface,
  PlayerGameplay,
  PlayerInfoSchema,
  UserCashSchema,
  UserProfile,
} from '../../objectModels';
import { dateUtils } from '../../utils/date';
import {
  getDropPoints,
  isPointsRummyFormat,
} from '../../utils/index';
import { cardHandler } from '../gameplay/cardHandler';

class GameTableInfo {
  formatGameTableInfo(
    tableConfigData: any,
    tableGamePlayData: any,
    userProfileData: UserProfile[],
    playerGameplayData: Array<any | null>,
    currentPlayer: any | null,
    turnHistorydata?: { lastPickCard: string },
  ): GameTableInfoInterface {
    const seatLength = userProfileData.length;
    const { tableState } = tableGamePlayData;
    const playerInfo = this.getPlayerInfo(
      playerGameplayData,
      userProfileData,
      tableConfigData.maximumPoints,
      tableGamePlayData,
      tableConfigData.gameType,
      tableConfigData._id,
      tableConfigData.maximumSeat,
    );
    const tableSessionId = currentPlayer?.tableSessionId;
    const unitySessionId =
      userProfileData.find((upd) => upd.id === currentPlayer?.userId)
        ?.unitySessionId || '';
    //this.getPlayerInfo(seatLength, usersData, tableConfigData, tableGamePlayData);
    if (!isPointsRummyFormat(tableConfigData.gameType))
      if (!currentPlayer) throw new Error(`Current user not present`);

    let timer = 0;
    if (
      tableState === TABLE_STATE.ROUND_TIMER_STARTED ||
      tableState === TABLE_STATE.LOCK_IN_PERIOD ||
      tableState === TABLE_STATE.ROUND_STARTED ||
      tableState === TABLE_STATE.DECLARED
    ) {
      const currentTime = new Date(); // current timestamp
      const diffInSec = Math.ceil(
        (new Date(tableGamePlayData.tableCurrentTimer).valueOf() -
          new Date(currentTime).valueOf()) /
          NUMERICAL.THOUSAND,
      );
      timer = diffInSec > 0 ? diffInSec : 0;
    }

    let roundFinishedUserIds: Array<number> = [];
    if (tableState === TABLE_STATE.DECLARED) {
      const declarePlayerData = playerGameplayData.find(
        (p: any) => p.userId === tableGamePlayData?.declarePlayer,
      );
      if (declarePlayerData) {
        roundFinishedUserIds.push(declarePlayerData.userId);
      }
      if (tableGamePlayData?.finishPlayer?.length > 0) {
        roundFinishedUserIds = [];
        playerGameplayData.forEach((pgp) => {
          if (
            pgp?.userId &&
            pgp.userStatus === PLAYER_STATE.PLAYING
          ) {
            roundFinishedUserIds.push(pgp.userId);
          }
        });
      }
    }
    let tenantToSend = '';
    const tenants = userProfileData.map((userData) => {
      if (userData.tenant === CONFIG.MUTANT_APPTYPE) {
        tenantToSend = userData.tenant;
      }
      return userData.tenant;
    });
    const data: GameTableInfoInterface = {
      tableId: tableConfigData._id,
      availablePlayers: seatLength,
      gameType: tableConfigData.gameType,
      tableState,
      wildCard: tableGamePlayData.trumpCard
        ? tableGamePlayData.trumpCard
        : '',
      papluCard: tableGamePlayData.papluCard,
      openDeck: tableGamePlayData.opendDeck,
      totalRounds: tableConfigData.dealsCount,
      currentTurn: tableGamePlayData.currentTurn,
      dealer: tableGamePlayData.dealerPlayer,
      currencyType: tableConfigData.currencyType,
      declarePlayer: tableGamePlayData.declarePlayer,
      potValue: tableGamePlayData.potValue || 0,
      lobbyId: tableConfigData.lobbyId,
      playerInfo: playerInfo,
      group: currentPlayer?.groupingCards || [],
      meld: currentPlayer
        ? cardHandler.labelTheMeld({
            meld: currentPlayer.meld,
            cardsGroup: currentPlayer.groupingCards,
          })
        : [],
      isRebuyApplicable: Boolean(
        tableGamePlayData?.rebuyableUsers?.find(
          (user) => user === currentPlayer?.userId,
        ),
      ),
      canPickWildcard: !tableGamePlayData.turnCount,
      roundFinishedUserIds: roundFinishedUserIds || [],
      turnTimer: dateUtils.addEpochTimeInSeconds(timer),
      currentRound: tableConfigData.currentRound,
      lastGreyOutCard: turnHistorydata?.lastPickCard || '',
      isLastScoreBoardEnabled: tableConfigData.currentRound !== 1,
      entryFee: tableConfigData.bootValue,
      tableSessionId,
      unitySessionId,
      networkParams: currentPlayer?.networkParams,
      maxScore:
        tableConfigData.maximumPoints === POOL_TYPES.SIXTY_ONE
          ? POINTS.MAX_DEADWOOD_POINTS_61
          : POINTS.MAX_DEADWOOD_POINTS,
      tenant: tenantToSend,
      standUpUserList: tableGamePlayData?.standupUsers?.length
        ? tableGamePlayData.standupUsers.map((au: any) => au._id)
        : [],
      showMplWalletInGame: zk.getConfig().SHOW_MPL_WALLET_IN_GAME,
    };
    return data;
  }

  getPlayerInfo(
    playerGameplayData: Array<any | null>,
    userProfileData: Array<UserProfile>,
    maximumPoints: number,
    tableGamePlayData: any,
    gameType: string,
    // currentUser: PlayerGameplay,
    tableId: string,
    maximumSeat: number,
  ): Array<PlayerInfoSchema> {
    const playerInfo: Array<PlayerInfoSchema> = [];
    for (let i = 0; i < userProfileData.length; ++i) {
      const currentUserProfileData = userProfileData[i];
      const currentPlayerGameplay = playerGameplayData[i];
      if (
        !currentPlayerGameplay ||
        currentPlayerGameplay?.userStatus === PLAYER_STATE.LEFT
      )
        continue;
      let userStatus: string = PLAYER_STATE.PLAYING;
      if (currentPlayerGameplay.points > 0) {
        userStatus = currentPlayerGameplay.userStatus.toLowerCase();
      }
      // if (currentPlayerGameplay.dealPoint >= maximumPoints) {
      //   userStatus = PLAYER_STATE.ELIMINATED;
      // }
      const currentSeatIndex = tableGamePlayData.seats.find(
        (val) => val.userId === currentUserProfileData.id,
      )?.seat;
      const userCashObj = (currentUserProfileData?.userTablesCash &&
        currentUserProfileData.userTablesCash.find(
          (utc: UserCashSchema) => utc.tableId === tableId,
        )) || { userCash: 0 };
      const currentPlayerInfo: PlayerInfoSchema = {
        userId: currentPlayerGameplay.userId,
        prime: currentUserProfileData.isPrime,
        seatIndex:
          currentSeatIndex || currentPlayerGameplay.seatIndex,
        username: currentUserProfileData.userName,
        profilePicture: currentUserProfileData.avatarUrl,
        status: userStatus,
        isShowTimeOutMsg: false,
        splitStatus: false,
        totalPoints: currentPlayerGameplay.dealPoint,
        isAutoDrop: currentPlayerGameplay.isAutoDrop,
        dropGame: getDropPoints(
          currentPlayerGameplay
            ? currentPlayerGameplay.isFirstTurn
            : false,
          maximumPoints,
          gameType,
          maximumSeat,
        ),
        tenant: currentUserProfileData.tenant,
        userCash: userCashObj.userCash,
      };
      playerInfo.push(currentPlayerInfo);
    }
    return playerInfo;
  }

  async getTableInfo(payload: { tableId: string }) {
    try {
      const { tableId } = payload;
      const config = zk.getConfig();
      const tableData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            'maximumSeat',
            'minimumSeat',
            'dealsCount',
            'gameType',
            'currencyFactor',
          ],
        );

      const response: any = {
        success: true,
        tableId,
        maxTimeout: config.MAX_TIMEOUT,
        decks:
          tableData.maximumSeat === NUMERICAL.TWO
            ? NUMERICAL.ONE
            : NUMERICAL.TWO,
        minimumPlayers: tableData.minimumSeat,
        totalRounds: tableData.dealsCount,
      };
      if (isPointsRummyFormat(tableData.gameType)) {
        response.firstDrop =
          tableData.currencyFactor * POINTS.FIRST_DROP;
        response.middleDrop =
          tableData.currencyFactor * POINTS.MIDDLE_DROP;
      }
      return response;
    } catch (error: any) {
      Logger.error('INTERNAL_SERVER_ERROR ERROR_EVENT getTableInfo', [error]);
      return {
        success: false,
        tableId: payload.tableId,
      };
    }
  }
}

const gameTableInfo = new GameTableInfo();
export = gameTableInfo;

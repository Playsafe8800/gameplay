import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import {
  CONNECTION_TYPE,
  EVENTS,
  LEAVE_TABLE_REASONS,
  PLAYER_STATE,
  TABLE_STATE,
  TURN_HISTORY,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { userProfileService } from '../../db/userProfile';
import {
  GameTableInfo,
  PlayerGameplay as PlayerGameplayInterface,
  UserProfile,
} from '../../objectModels';
import LeaveTableHandler from '../../services/leaveTable';
import { socketOperation } from '../../socketHandler/socketOperation';
import { isPointsRummyFormat } from '../../utils';
import { splitHandler } from '../split';
import { userService } from '../userService';
import gameTableInfo from './gameTableInfo';
import { tableOperation } from './tableOperation';

export async function reconnectTable(
  socket: any,
  connectionType: string,
) {
  try {
    const { userId } = socket;

    // Create or find user
    const userData: any = await userService.findOrCreateUser(
      userId,
      socket.id,
      socket.handshake?.headers,
      socket.data.AppType,
    );

    // Get all tableIds
    const prevGameTableIds = userData?.tableIds.slice(-1) || [];
    Logger.info(
      `prevGameTableIds: ${userId} >> ${userData?.tableIds}`,
    );

    // Get GTI data from tableId
    const gtiData = (
      await Promise.all(
        prevGameTableIds.map(
          async (singleTableId: string) =>
            await getReconnectionTableData(
              userData,
              singleTableId,
              socket,
            ),
        ),
      )
    ).filter(Boolean);

    if (prevGameTableIds.length === 0 || gtiData.length === 0) {
      // Find a new table
    }
    // let finalGTIData: any[] = gtiData;
    // // check if user is alone on some table
    // if (connectionType === CONNECTION_TYPE.REJOIN) {
    //   finalGTIData = [];
    //   for (let i = 0; i < gtiData.length; i++) {
    //     const currentGTIData = gtiData[i];
    //     if (
    //       currentGTIData.tableState ===
    //         TABLE_STATE.WAITING_FOR_PLAYERS ||
    //       currentGTIData.tableState ===
    //         TABLE_STATE.ROUND_TIMER_STARTED
    //     ) {
    //       await LeaveTableHandler.main(
    //         {
    //           reason: LEAVE_TABLE_REASONS.AUTO_REMOVABLE_TABLE,
    //           tableId: currentGTIData.tableId,
    //         },
    //         userId,
    //       );
    //     } else {
    //       finalGTIData.push(currentGTIData);
    //     }
    //   }
    // }

    const response = {
      signupResponse: {
        userId: userData.id,
        username: userData.userName,
        profilePicture: userData.avatarUrl,
        tenant: userData.tenant,
      },
      gameTableInfoData: gtiData,
    };
    return response;
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR ${error.message} at reconnect table handler`, [
      error,
    ]);
    throw error;
  }
}

async function getReconnectionTableData(
  userData: UserProfile,
  tableId: string,
  socket: any,
) {
  Logger.info(`getReconnectionTableData >> table: ${tableId}`);
  let tableGameData;
  let playerGameData!: any | null;

  const tableData =
    await tableConfigurationService.getTableConfiguration(tableId, [
      'currentRound',
    ]);
  Logger.info(`getReconnectionTableData: ${tableId}, tableConfig: `, [
    tableData,
  ]);
  if (!tableData) {
    Logger.error(
      `INTERNAL_SERVER_ERROR getReconnectionTableData: tableConfigData not found for ${tableId}`,
    );
    return;
  }
  if (tableData) {
    [tableGameData, playerGameData] = await Promise.all([
      tableGameplayService.getTableGameplay(
        tableId,
        tableData.currentRound,
        ['tableState'],
      ),
      playerGameplayService.getPlayerGameplay(
        userData.id,
        tableId,
        tableData.currentRound,
        [
          'userId',
          'tableSessionId',
          'meld',
          'groupingCards',
          'networkParams',
          'userStatus',
        ],
      ),
    ]);
  }
  Logger.info(`getReconnectionTableData: ${tableId}, TGP, PGP: `, [
    tableGameData,
    playerGameData,
  ]);
  if (!tableGameData) {
    Logger.error(
      `INTERNAL_SERVER_ERROR getReconnectionTableData: TGP / PGP not found for ${tableId}!`,
    );
    return;
  }

  let gtiData!: GameTableInfo | null;
  if (
    tableData &&
    tableGameData?.tableState !== TABLE_STATE.WINNER_DECLARED &&
    tableGameData?.tableState !== TABLE_STATE.PLAY_MORE &&
    playerGameData?.userStatus !== PLAYER_STATE.LEFT
  ) {
    // Get rejoin user GTI data
    gtiData = await rejoinUser(
      socket,
      tableId,
      userData,
      playerGameData,
    );
  }
  if (
    tableData &&
    (tableGameData?.tableState === TABLE_STATE.WINNER_DECLARED ||
      tableGameData?.tableState === TABLE_STATE.PLAY_MORE) &&
    playerGameData?.userStatus === PLAYER_STATE.LEFT
  ) {
    // instrumentation call
    // userGameRejoin({
    //   tableData,
    //   tableGamePlay: tableGameData,
    //   userId: userData.id,
    //   isJoined: false,
    //   reason: INSTRUMENTATION_EVENT_REASONS.GAME_ENDED_BEFORE_REJOIN,
    // });
  }
  return gtiData;
}

async function rejoinUser(
  socket: any,
  tableId: string,
  userData: any,
  playerGameplayData: any | null,
) {
  Logger.info(`rejoinUser: ${tableId}`, [
    userData,
    playerGameplayData,
  ]);
  try {
    const tableConfigurationData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        '_id',
        'gameType',
        'maximumPoints',
        'rebuyUsed',
        'maximumSeat',
        'maximumSeat',
        'dealsCount',
        'currencyType',
        'lobbyId',
        'currentRound',
        'bootValue',
      ]);
    const { currentRound } = tableConfigurationData;
    const tableGameplayData =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        [
          'tableState',
          'standupUsers',
          'turnCount',
          'rebuyableUsers',
          'potValue',
          'declarePlayer',
          'dealerPlayer',
          'currentTurn',
          'opendDeck',
          'trumpCard',
          'finishPlayer',
          'tableCurrentTimer',
          'seats',
        ],
      );

    let turnObject;
    const currentRoundHistory =
      await turnHistoryService.getTurnHistory(tableId, currentRound);
    if (currentRoundHistory) {
      turnObject =
        currentRoundHistory.turnsDetails[
          currentRoundHistory.turnsDetails.length - 1
        ];
    }
    if (!tableGameplayData) {
      throw new Error(
        `Table game play doesn't exist rejoinUser ${tableId}`,
      );
    }
    Logger.info(`rejoinUser: >> `, [
      tableConfigurationData,
      tableGameplayData,
    ]);
    const filteredSeats = tableGameplayData.seats.filter(
      (seat: any) => seat._id,
    );
    const promiseList = filteredSeats.map((seat: any) =>
      userProfileService.getOrCreateUserDetailsById(seat._id),
    );
    const promiseListPGP = filteredSeats.map((seat: any) =>
      playerGameplayService.getPlayerGameplay(
        seat._id,
        tableId,
        tableConfigurationData.currentRound,
        [
          'userId',
          'userStatus',
          'points',
          'seatIndex',
          'dealPoint',
          'isAutoDrop',
          'isFirstTurn',
        ],
      ),
    );
    const usersData: Array<UserProfile> = await Promise.all(
      promiseList,
    );
    const playerGameplayDataUsers: Array<any | null> =
      await Promise.all(promiseListPGP);

    /**
     * Play more is the last state of tale
     * If game is finished, then send GTI event with play more key set to true
     */
    if (
      zk.getConfig().PLAYMORE &&
      tableGameplayData.tableState === TABLE_STATE.PLAY_MORE
    ) {
      userData.playMore = true;
    }

    // JOINS PLAYER TO SOCKET ROOM
    tableOperation.addPlayerInTable(socket, {
      tableId,
      usersData,
      maximumSeat: tableConfigurationData?.maximumSeat,
    });

    const gtiData = gameTableInfo.formatGameTableInfo(
      tableConfigurationData,
      tableGameplayData,
      usersData,
      playerGameplayDataUsers,
      playerGameplayData,
      {
        lastPickCard:
          turnObject &&
          turnObject.cardPickSource === TURN_HISTORY.OPENED_DECK
            ? turnObject.cardPicked
            : '',
      },
    );

    gtiData.split = false;
    if (!isPointsRummyFormat(tableConfigurationData.gameType)) {
      const activeSplitData =
        await tableGameplayService.getSplitRequest(tableId);
      // this represents whether the table is eligible for split and no one has actually done split
      if (activeSplitData) {
        socketOperation.sendEventToRoom(
          tableId,
          EVENTS.SPLIT_INFORMATION,
          activeSplitData,
        );
      } else {
        const isSplitable = await splitHandler.isTableSplitable(
          playerGameplayDataUsers,
          tableConfigurationData,
        );
        if (
          isSplitable &&
          isSplitable.splitType &&
          tableGameplayData.tableState ===
            TABLE_STATE.ROUND_TIMER_STARTED
        )
          gtiData.split = true;
      }
    }

    // instrumentation call
    // userGameRejoin({
    //   tableData: tableConfigurationData,
    //   tableGamePlay: tableGameplayData,
    //   userId: userData.id, // TODO: pass only userId
    //   isJoined: true,
    //   reason: INSTRUMENTATION_EVENT_REASONS.REJOINED_SUCCESSFULLY,
    // });
    return gtiData;
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR rejoinUser: > ${tableId}`, [
      userData,
      playerGameplayData,
      error,
    ]);
    return null;
  }
}

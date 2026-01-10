import { alertPopup } from '../../centralLibrary/index';
import {
  AlertType,
  ButtonAction,
  Color,
  ColorHexCode,
} from '../../centralLibrary/enums';
import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import { zk } from '../../connections';
import {
  EVENTS,
  LEAVE_TABLE_REASONS,
  GRPC_ERRORS,
  NUMERICAL,
  POOL_TYPES,
  POPUP_TITLES,
  REJOIN_POINTS,
  TABLE_STATE,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import {
  PlayerGameplay,
  RebuyGrpcRes,
  RebuyPopupReq,
  RebuyPopupRes,
  RejoinTableReq,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { dateUtils } from '../../utils/date';
import { redlock } from '../../utils/lock/redlock';
import { validateRebuyActionRes } from '../../validators/response.validator';
import LeaveTableHandler from '../leaveTable';
import { tableOperation } from '../signUp/tableOperation';

class RebuyHandler {
  async rebuyPopup(
    data: RebuyPopupReq,
    socket: any,
  ): Promise<RebuyPopupRes> {
    const { tableId } = data;
    try {
      const tableConfigurationData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['bootValue', 'currentRound'],
        );
      const { currentRound } = tableConfigurationData;

      const tableGameplayData =
        await tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ['tableState'],
        );
      if (!tableGameplayData) {
        throw Error(
          `TGP for table ${tableId}-${currentRound} not found from rebuy`,
        );
      }

      const isTableOpen =
        tableGameplayData.tableState ===
          TABLE_STATE.ROUND_TIMER_STARTED ||
        tableGameplayData.tableState ===
          TABLE_STATE.WAITING_FOR_PLAYERS;

      const { REBUY_POPUP_TEXT, REBUY_INVALID_POPUP } =
        zk.getConfig();
      const rebuyPopupAckRes = {
        tableId,
        seconds: dateUtils.addEpochTimeInSeconds(NUMERICAL.ZERO),
        message: REBUY_INVALID_POPUP,
      };
      if (isTableOpen) {
        rebuyPopupAckRes.message = REBUY_POPUP_TEXT.replace(
          '#20',
          `#${tableConfigurationData.bootValue}`,
        );
        rebuyPopupAckRes.seconds = dateUtils.addEpochTimeInSeconds(
          NUMERICAL.FIFTEEN,
        );
      }
      return rebuyPopupAckRes;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Found error on rebuyPopup for user: ${socket.userId}: table: ${tableId}, ${error.message}`,
        [error],
      );
      return { success: false, tableId, seconds: '', message: '' };
    }
  }

  async rebuyTable(
    data: RejoinTableReq,
    userId: number,
  ): Promise<void> {
    const { action, tableId } = data;
    let lock!: Lock;
    try {
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      Logger.info(
        `Lock acquired, in rebuyTable resource:, ${lock.resource}`,
      );

      if (action) await this.handleRebuyAccept(tableId, userId);
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR rejoinTable table ${tableId} user ${userId}, ${error.message}`,
        [error],
      );
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in rebuyTable; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on rebuyTable: ${err}`,err
        );
      }
    }
  }

  private async handleRebuyAccept(
    tableId: string,
    userId: number,
  ): Promise<void> {
    const tableConfigurationData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currentRound',
        'maximumPoints',
        'bootValue',
      ]);
    const { currentRound, maximumPoints } = tableConfigurationData;

    const tableGameplayData =
      await tableGameplayService.getTableGameplay(
        tableId,
        currentRound,
        ['potValue', 'rebuyableUsers', 'tableState', 'seats'],
      );
    if (!tableGameplayData) {
      throw Error(
        `TGP for table ${tableId}-${currentRound} not found from rebuy`,
      );
    }

    const { tableState, seats } = tableGameplayData;
    const isTableOpen =
      tableState === TABLE_STATE.WAITING_FOR_PLAYERS ||
      tableState === TABLE_STATE.ROUND_TIMER_STARTED;

    Logger.debug(`handleRebuyAccept: isTableOpen ${isTableOpen}`);
    if (!isTableOpen) return;

    let pgps: (any | null)[] = await Promise.all(
      seats.map((seat) =>
        playerGameplayService.getPlayerGameplay(
          seat._id,
          tableId,
          currentRound,
          ['userId', 'dealPoint', 'networkParams', 'tableSessionId'],
        ),
      ),
    );
    pgps = pgps.filter(Boolean);
    const playerGamePlays: any[] = pgps;

    const currentPlayerGameplay = playerGamePlays.find(
      (e: any) => e?.userId === userId,
    );
    if (!currentPlayerGameplay)
      throw new Error(
        `handleRebuyAccept: PlayerGamePlay not found user: ${userId}, 
        table: ${tableId}-${currentRound}`,
      );

    const maximumPointsPlayer = this.playerMaxPoints(
      playerGamePlays,
      maximumPoints,
      userId,
    );

    const isUserEliminated =
      currentPlayerGameplay.dealPoint >= maximumPoints;

    const dealPoints: number = this.getMaximumPoints(
      maximumPointsPlayer,
      maximumPoints,
    );

    Logger.info(
      `rebuy request isTableOpen ${isTableOpen} isUserEliminated ${isUserEliminated} dealPoints ${dealPoints}`,
    );
    // rebuy condition
    if (isTableOpen && isUserEliminated && dealPoints) {
      Logger.info(
        `rebuy request valid for user: ${userId}, table: ${tableId}-${currentRound}`,
      );
      const userInfo = await userProfileService.getUserDetailsById(
        userId,
      );

      if (!userInfo) {
        throw new Error(`handleRebuyAccept: UserProfile not found user: ${userId}, 
        table: ${tableId}-${currentRound}`);
      }
      const seatIndex = tableOperation.insertPlayerInSeat(
        seats,
        userId,
        userInfo.isBot
      );
      const newPlayerGamePlay =
        playerGameplayService.getDefaultPlayerGameplayData(
          userId,
          seatIndex,
          dealPoints,
          true, // useRebuy
          currentPlayerGameplay.networkParams,
          currentPlayerGameplay.tableSessionId,
        );



      // GRPC request
      // const grpcResponse = await grpcRebuy.rebuyRequest(
      //   tableId,
      //   userId,
      //   lobbyId,
      //   tableConfigurationData.cgsClusterName,
      // );

      // ERROR
      // if (grpcResponse?.error) {
      //   this.handleGrpcError(
      //     grpcResponse,
      //     tableId,
      //     userId,
      //     userInfo.socketId,
      //   );
      //   return;
      // }

      // Success,
      // if (grpcResponse?.isSuccess) {
      tableGameplayData.potValue += tableConfigurationData.bootValue;
      if (
        tableGameplayData?.rebuyableUsers &&
        tableGameplayData.rebuyableUsers.length > 0
      ) {
        tableGameplayData.rebuyableUsers =
          tableGameplayData.rebuyableUsers.filter(
            (id: number) => id != userId,
          );
      }
      // it will be used for split
      tableConfigurationData.rebuyUsed = true;

      await Promise.all([
        playerGameplayService.setPlayerGameplay(
          userId,
          tableId,
          currentRound,
          newPlayerGamePlay,
        ),
        tableGameplayService.setTableGameplay(
          tableId,
          currentRound,
          tableGameplayData,
        ),
      ]);

      const rebuyActionRes = {
        tableId,
        userId,
        username: userInfo.userName,
        avatarUrl: userInfo.avatarUrl,
        seatIndex,
        totalPoints: newPlayerGamePlay.dealPoint,
        totalBootValue: tableGameplayData.potValue,
        status: newPlayerGamePlay.userStatus,
        tenant: userInfo.tenant,
      };

      validateRebuyActionRes(rebuyActionRes);

      socketOperation.sendEventToRoom(
        tableId,
        EVENTS.REBUY_ACTION,
        rebuyActionRes,
      );
      // }
    }
  }

  private handleGrpcError(
    grpcResponse: RebuyGrpcRes,
    tableId: string,
    userId: number,
    socketId: string,
  ) {
    Logger.error(
      `INTERNAL_SERVER_ERROR rebuy handleGrpcError table ${tableId} user ${userId} socketId ${socketId}  `,
      [grpcResponse],
    );

    LeaveTableHandler.main(
      {
        reason: LEAVE_TABLE_REASONS.GRPC_FAILED,
        tableId,
      },
      userId,
    );

    let erorrMsg: string = zk.getConfig().ERRM;
    let erorrTitle: string = POPUP_TITLES.ALERT;
    if (
      grpcResponse.error.reason === GRPC_ERRORS.INSUFFICIENT_FUNDS
    ) {
      erorrMsg = zk.getConfig().IMWPM;
      erorrTitle = POPUP_TITLES.INSUFFICIENT_FUND;
    }
    this.sendPopUp(tableId, userId, socketId, erorrMsg, erorrTitle);
  }

  private sendPopUp(
    tableId: string,
    userId: number,
    socketId: string,
    content: string,
    title: string,
  ): void {
    alertPopup.CustomCommonPopup(
      socketId,
      {
        content,
        title,
        textColor: ColorHexCode.WHITE,
      },
      {
        apkVersion: 0,
        tableId,
        userId: `${userId}`,
        error: AlertType.INSUFFICIENT_FUND,
      },
      [
        {
          text: 'EXIT',
          action: ButtonAction.GOTOLOBBY,
          color_hex: ColorHexCode.RED,
          color: Color.RED,
        },
      ],
    );
  }

  private playerMaxPoints(
    playerGamePlays: Array<any>,
    tableMaxPoint: number,
    userId: number,
  ): number {
    let maximumPoints = -Infinity;
    for (let i = 0; i < playerGamePlays.length; i++) {
      const playerGame = playerGamePlays[i];

      if (
        playerGame.dealPoint < tableMaxPoint &&
        playerGame.dealPoint > maximumPoints &&
        playerGame.userId !== userId
      ) {
        maximumPoints = playerGame.dealPoint;
      }
    }
    return maximumPoints;
  }

  private getMaximumPoints(
    maxPoints: number,
    tableMaxPoint: number,
  ): number {
    if (
      tableMaxPoint === POOL_TYPES.TWO_ZERO_ONE &&
      maxPoints <= REJOIN_POINTS.HUNDRED_SEVENTY_FOUR
    ) {
      return maxPoints + 1;
    }
    if (maxPoints <= REJOIN_POINTS.SEVENTY_NINE) {
      return maxPoints + 1;
    }
    return 0;
  }
}

export = new RebuyHandler();

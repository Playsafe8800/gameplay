import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import {
  NUMERICAL,
  OPEN_POPUP_ACTION,
  PLAYER_STATE,
  TABLE_STATE,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { userProfileService } from '../../db/userProfile';
import { getDropPoints, isPointsRummyFormat } from '../../utils';
import { CancelBattleError } from '../../utils/errors/index';
import { cancelBattle } from '../gameplay/cancelBattle';

export async function handleOpenGamePopup(
  data: { tableId: string; action: string },
  socket: any,
) {
  try {
    if (!data.tableId || !data.action) {
      Logger.error(`INTERNAL_SERVER_ERROR handlePopupMessage data missing: `, [data]);
      throw new Error('data not valid on handlePopupMessage!');
    }
    const { tableId, action } = data;
    const { userId } = socket;

    const tableConfigData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        'currencyFactor',
        'currencyType',
        'maximumPoints',
        'gameType',
        'maximumSeat',
        'bootValue',
        'currentRound',
      ]);
    const { currentRound, gameType } = tableConfigData;

    const [
      tableGamePlayData,
      playerGamePlayData,
      userProfile,
    ]: Array<any> = await Promise.all([
      tableGameplayService.getTableGameplay(tableId, currentRound, [
        'tableState',
        'seats',
      ]),
      playerGameplayService.getPlayerGameplay(
        userId,
        tableId,
        currentRound,
        ['isFirstTurn', 'userStatus'],
      ),
      userProfileService.getUserDetailsById(userId),
    ]);

    /**
     * True when user is playing and winner has not been declared
     */
    const tableState = [
      TABLE_STATE.WAITING_FOR_PLAYERS,
      TABLE_STATE.ROUND_TIMER_STARTED,
    ];
    const isUserPlaying =
      !tableState.includes(tableGamePlayData?.tableState) &&
      playerGamePlayData?.userStatus === PLAYER_STATE.PLAYING;

    const tableBootValue =
      tableConfigData.bootValue * tableGamePlayData?.seats.length;
    const entryFee = tableBootValue
      ? tableBootValue
      : tableConfigData.bootValue;

    let message = '';
    let title = 'Alert';
    switch (data.action) {
      case OPEN_POPUP_ACTION.DECLARE:
        message = zk.getConfig()?.DPM || '';
        break;
      case OPEN_POPUP_ACTION.EXIT:
        {
          if (isUserPlaying) {
            message =
              zk.getConfig()?.EM.replace('#80', `#${entryFee}`) || '';
          } else {
            message =
              userProfile?.tableIds?.length > 1
                ? zk.getConfig()?.EMM
                : zk.getConfig()?.EMM.split('$')[0] ||
                  zk.getConfig()?.EMM;
          }
        }
        break;
      case OPEN_POPUP_ACTION.DROP: {
        const { isFirstTurn } = playerGamePlayData;
        const points = getDropPoints(
          isFirstTurn,
          tableConfigData.maximumPoints,
          tableConfigData.gameType,
          tableConfigData.maximumSeat,
        );

        title = `YOU WILL LOSE ${
          tableConfigData.currencyType === 'COINS' ? 'COINS' : 'RS'
        } . ${tableConfigData.currencyFactor * points} IF YOU DROP.`;
        message =
          zk.getConfig()?.DRM.replace('#20', `#${points} points`) ||
          '';
        if (isPointsRummyFormat(gameType)) {
          message =
            zk
              .getConfig()
              ?.DRMP.replace('#20', `#${points} points`) || '';
          if (message && points === NUMERICAL.FORTY) {
            message = `Middle ${message}`;
          }
        }
        break;
      }
    }

    const responseData = {
      tableId,
      action,
      message,
      isUserPlaying,
      title,
    };
    return responseData;
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR error on handlePopupMessage: table: ${data.tableId}|action:${data.action},
      errMessage: ${error.message}`,
      [error],
    );
    if (error instanceof CancelBattleError) {
      await cancelBattle.cancelBattle(data.tableId, error);
    }

    return { success: false, error: error.message };
  }
}

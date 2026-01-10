import { ScoreBoardPlayerInfoData } from '../objectModels/turnHistory';
import { UserProfile } from '../objectModels/user';
import { baseTable, baseAppData } from './baseTable';
import { PlayerGameplay } from '../objectModels/playerGameplay';
import { PLAYER_STATE } from '../constants/playerState';
import { POINTS } from '../constants/index';
import { Logger } from '../newLogger';
import { getRoundEndReason } from '../utils/index';

export async function userPlayedGame(
  playersGameData: Array<ScoreBoardPlayerInfoData>,
  userId: number,
  playersInfoData: (UserProfile | null)[],
  tableData: any,
  tableGamePlay: any,
  playerGamePlay: PlayerGameplay,
  winnerId: number,
  userAppData?: any,
) {
  try {
    const opponenets = playersGameData.filter(
      (e) => e.userId !== userId,
    );

    const opponentsUserId = opponenets
      .map((e) => `${e.userId}`)
      .join();

    const opponentsDisplayName = playersInfoData
      .map((e) => e?.id !== userId && e?.userName)
      .filter(Boolean)
      .join();

    const opponentsStatus = opponenets
      .map((e) => `${e.userStatus}`)
      .join();

    const tableObject = baseTable(tableData, tableGamePlay, userId);
    if (userAppData) {
      baseAppData(userAppData, tableObject);
    }
    let dropVal = 0;
    let middleDropVal = 0;
    if (
      playerGamePlay.userStatus === PLAYER_STATE.DROP &&
      (playerGamePlay.points === POINTS.FIRST_DROP ||
        playerGamePlay.points === POINTS.FIRST_DROP_201)
    ) {
      dropVal = playerGamePlay.points;
    } else if (
      playerGamePlay.userStatus === PLAYER_STATE.DROP &&
      (playerGamePlay.points === POINTS.MIDDLE_DROP ||
        playerGamePlay.points === POINTS.MIDDLE_DROP_201)
    ) {
      middleDropVal = playerGamePlay.points;
    }

    tableObject['Is Won'] = winnerId === userId;
    tableObject['Game End Reason'] = getRoundEndReason(
      playerGamePlay,
      winnerId,
    );
    tableObject['Game Score'] = tableGamePlay.totalPlayerPoints;
    tableObject['Drop Value'] = dropVal;
    tableObject['Middle Drop Value'] = middleDropVal;
    tableObject['Game Score'] = playerGamePlay.dealPoint;
    tableObject['Players Count'] = tableGamePlay.seats.length;
    tableObject['Opponent User ID'] = opponentsUserId;
    tableObject['Opponent Display Name'] = opponentsDisplayName;
    tableObject['Opponent Status'] = opponentsStatus;
    tableObject['Round Number'] = tableData.currentRound;
    // const sendEventData = {
    //   key: INSTRUMENTATION_EVENTS.USER_PLAYED_GAME,
    //   timestamp: new Date().getTime(),
    //   payload: tableObject,
    // };

    // Logger.info(
    //   'Instrumentation: userPlayedGame request ',
    //   sendEventData,
    // );
    // await grpcInstrumentation.sendInstrumentation(
    //   sendEventData,
    //   tableData.gameType,
    //   tableData.cgsClusterName,
    // );

    return tableObject;
  } catch (error: any) {
    // @ts-ignore
    Logger.error('INTERNAL_SERVER_ERROR CATCH_ERROR:', [
      'userPlayedGame',
      error.message,
      error,
    ]);
    return false;
  }
}

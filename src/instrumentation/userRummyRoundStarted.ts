import { Logger } from '../newLogger';
import { baseTable } from './baseTable';

export async function userRummyRoundStarted(
  tableData: any,
  tableGamePlay: any,
  userId: number,
) {
  try {
    const tableObject = baseTable(tableData, tableGamePlay, userId);
    tableObject['Game Start Time'] = new Date().getTime();
    tableObject['Players Count'] = tableGamePlay.seats.length;
    tableObject['Opponent User ID'] = tableGamePlay.seats
      .filter((e) => e._id !== userId)
      .map((e) => `${e._id}`)
      .join();
    tableObject['Round Number'] = tableData.currentRound;

    // const sendEventData = {
    //   key: INSTRUMENTATION_EVENTS.USER_RUMMY_ROUND_STARTED,
    //   timestamp: new Date().getTime(),
    //   payload: tableObject,
    // };
    // await grpcInstrumentation.sendInstrumentation(
    //   sendEventData,
    //   tableData.gameType,
    //   tableData.cgsClusterName,
    // );

    return tableObject;
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR userRummyRoundStarted res: `, [
      tableData,
      tableGamePlay,
      userId,
      error.message,
      error,
    ]);
    return false;
  }
}

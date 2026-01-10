import { Logger } from '../newLogger';
import { baseTable } from './baseTable';

export async function userGameRejoin(res: any) {
  try {
    const { tableData, tableGamePlay, userId, isRejoin, reason } =
      res;
    const tableObject = baseTable(tableData, tableGamePlay, userId);
    tableObject['Is Success'] = isRejoin;
    tableObject['Fail Reason'] = reason;

    // const sendEventData = {
    //   key: INSTRUMENTATION_EVENTS.USER_GAME_REJOINED,
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
    Logger.error(`INTERNAL_SERVER_ERROR userGameRejoin res: `, [res, error.message, error]);
    return false;
  }
}

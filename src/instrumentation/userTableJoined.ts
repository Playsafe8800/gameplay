import { Logger } from '../newLogger';
import { baseTable } from './baseTable';

export async function userTableJoined(res: any) {
  try {
    Logger.debug('table join event.......');
    const {
      tableData,
      tableGamePlay,
      userId,
      isJoined,
      reason,
      isTopUp = false,
    } = res;
    const tableObject = baseTable(tableData, tableGamePlay, userId);

    tableObject['Is Success'] = isJoined;
    tableObject['Fail Reason'] = reason;
    tableObject['Is Top Up'] = isTopUp;

    // const sendEventData = {
    //   key: INSTRUMENTATION_EVENTS.USER_TABLE_JOINED,
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
    Logger.error(`INTERNAL_SERVER_ERROR userPlayedGame res: `, [res, error.message]);
    return false;
  }
}

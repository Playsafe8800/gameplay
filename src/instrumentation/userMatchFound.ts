import { Logger } from '../newLogger';
import { baseTable, baseAppData } from './baseTable';

export async function userMatchFound(
  tableData: any,
  tableGameplayData: any,
  userId: number,
  userAppData: any,
) {
  try {
    const tableObject = baseTable(
      tableData,
      tableGameplayData,
      userId,
    );
    // tableObject['MM Service'] = MMSERVICE.CGS;
    // tableObject['MM Type'] = MMTYPE.FIFO;

    if (userAppData) {
      baseAppData(userAppData, tableObject);
    }
    // const sendEventData = {
    //   key: INSTRUMENTATION_EVENTS.USER_MATCH_FOUND,
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
    Logger.error(`INTERNAL_SERVER_ERROR userMatchFound res: `, [
      tableData,
      userAppData,
      error.message,
      error,
    ]);
    return false;
  }
}

import { Logger } from '../newLogger';
import { TABLE_STATE } from '../constants';
import { baseTable } from './baseTable';

export async function userTableExited(res: any) {
  try {
    const { tableData, tableGamePlay, userId, isGameStarted } = res;
    const tableObject: any = baseTable(
      tableData,
      tableGamePlay,
      userId,
    );
    let { tableCurrentTimer } = tableGamePlay;

    tableCurrentTimer = tableCurrentTimer || new Date();
    const currentDate = new Date();

    const diffInSec: number = Math.ceil(
      (new Date(tableCurrentTimer).valueOf() -
        new Date(currentDate).valueOf()) /
        1000,
    );

    const hasGameStated =
      tableGamePlay.tableState !== TABLE_STATE.ROUND_TIMER_STARTED;

    tableObject['Time Left'] =
      diffInSec > 3 && !hasGameStated ? diffInSec : 'N/A';
    tableObject.isGameStarted = isGameStarted;

    if (tableGamePlay.tableState === TABLE_STATE.WAITING_FOR_PLAYERS)
      tableObject['Time Left'] = 15;

    // const sendEventData = {
    //   key: INSTRUMENTATION_EVENTS.USER_TABLE_EXITED,
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
    Logger.error(`INTERNAL_SERVER_ERROR userTableExited res: `, [res, error.message]);
    return false;
  }
}

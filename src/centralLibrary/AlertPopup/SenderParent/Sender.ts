import { AlertInfo, Metrics } from '../../@types';
import { metricsEmitMid } from '../../auth-me/utils';
import { Logger } from '../../../newLogger';
import { socket as socketConn } from '../../../connections';

export class Sender {
  protected sendEvent(
    eventName: string,
    socket: any,
    data: any,
    logObj: AlertInfo,
  ) {
    try {
      data = { tableId: logObj.tableId, ...data };
      data = { en: eventName, data };
      if (typeof socket !== 'string')
        socket.emit(
          eventName,
          metricsEmitMid(data, logObj?.userId || '', true),
          (data: string) => {
            const ackResponse: { metrics: Metrics } =
              JSON.parse(data);
            ackResponse.metrics.srct = `${new Date().getTime()}`;
            Logger.info(
              `Acknowledgement received from client for ${eventName} event and it's metrices are : `,
              [ackResponse.metrics],
            );
          },
        );
      else
        socketConn.socketClient
          .to(socket)
          .emit(eventName, metricsEmitMid(data, logObj.userId || ''));
      Logger.info(
        `SEND POPUP TO CLIENT: ${logObj?.tableId || ''}  user: ${
          logObj?.userId || ''
        }, ${logObj.error} : ${logObj.reason}`,
        [data],
      );
    } catch (error: any) {
      Logger.error(`CATCH_ERROR: SendPopup Event`, data, error);
    }
  }
}

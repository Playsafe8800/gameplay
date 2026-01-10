import { Logger } from '../newLogger';
import { AcknowledgeInput, Metrics } from '../@types';

export function ackMid(
  { success, error, ...data }: AcknowledgeInput,
  metrics: Metrics,
  userId: number,
  tableId: string,
  ack: (response: string) => void,
  serverReceiveTime: string,
  eventName?: string,
) {
  try {
    metrics.srct = serverReceiveTime;
    metrics.srpt = `${new Date().getTime()}`;
    metrics.tableId = tableId;
    const response = {
      success,
      error,
      data,
      metrics,
      userId,
      tableId,
    };
    ack(JSON.stringify(response));
    if (eventName !== 'HEART_BEAT')
      Logger.info('RESPONSE SENT ', response);
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR CATCH_ERROR: Error while sending Acknowledgement ${error}`,
      [error],
    );
    throw new Error(error);
  }
}

export function metricsEmitMid(
  response: { [x: string]: any; en: string },
  userId?: string,
  ackRequired?: boolean,
  tableId?: string,
  serverReceiveTime?: string,
) {
  try {
    response =
      typeof response === 'string' ? JSON.parse(response) : response;
    const metrics: Metrics = {
      uuid: Date.now().toString(),
      ctst: '',
      srct: serverReceiveTime || '',
      srpt: `${new Date().getTime()}`,
      crst: '',
      userId: userId || '',
      apkVersion: '',
      tableId: tableId || '',
    };
    Object.assign(response, { metrics, ackRequired: !!ackRequired });
    const res = { data: JSON.stringify(response) };

    const eventName = response.en;
    Logger.debug(
      `SETTING METRICS FOR ${eventName} EVENT TO ${userId} : `,
      res,
    );
    return res;
  } catch (error: any) {
    throw new Error(error);
  }
}

export function metricsOnMid(client: any) {
  return (socket: any, next: () => void) => {
    try {
      if (socket[1] && socket[0]) {
        const [eventName, request] = socket;
        let clientInput =
          typeof request === 'string' ? JSON.parse(request) : request;
        if (clientInput.metrics) {
          clientInput.metrics.srct = `${new Date().getTime()}`;
          clientInput.metrics.userId = socket.userId;
          clientInput = JSON.stringify(clientInput);
          socket[1] = clientInput;
          next();
        } else {
          Logger.error(
            `INTERNAL_SERVER_ERROR METRICS_MISSING for event: ${eventName} for user ${socket.userId}`,
          );
        }
      }
    } catch (error) {
      Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR metricsOnMid: ${error}`, [error]);
    }
  };
}

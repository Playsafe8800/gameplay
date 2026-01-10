import {
  AcknowledgeInput,
  GRPCAuthResponse,
  Metrics,
} from '../../@types';
import { getRandomUUID } from '../helpers';
import { authenticateGameCardServer } from '../grpc';
import { Logger } from '../../../newLogger';

/**
 *
 * @param client
 * @returns a middleware for socket
 */
export function authValidationMid(client: any) {
  return async (socket: any, next: () => void) => {
    try {
      const { token } = socket.handshake.Auth;
      const grpcAuthRes: GRPCAuthResponse =
        await authenticateGameCardServer({
          userAuthToken: token,
        });
      if (
        !(
          grpcAuthRes &&
          grpcAuthRes.isAuthentic &&
          grpcAuthRes.userId
        )
      ) {
        Logger.info(
          `User ${grpcAuthRes.userId} not is authenticated ..`,
        );
        client.disconnect();
      }
      socket.userId = grpcAuthRes.userId;
      next();
    } catch (error) {
      client.disconnect();
    }
  };
}

/**
 *
 * @param client
 * @returns a Middleware function
 * Check and update the metrics for the client
 */
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
      Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: ${error}`);
    }
  };
}

/**
 *
 * @param response the payload to send
 * @optional @param userId userId
 * @optional @param ackRequired in case of broadcasting can be avoided
 * @optional @param tableId User table Id if available
 * @returns payload with metrics binded
 */
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
      uuid: getRandomUUID(),
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

/**
 *
 * Sends Socket event's acknowledgement to client
 * @param { AcknowledgeInput } param0
 * @param { Metrics } metrics
 * @param userId
 * @param tableId
 * @param ack
 *
 */
export function ackMid(
  { success, error, ...data }: AcknowledgeInput,
  metrics: Metrics,
  userId: number,
  tableId: string,
  ack: (response: string) => void,
  serverReceiveTime: string,
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
  } catch (error: any) {
    Logger.error(`INTERNAL_SERVER_ERROR CATCH_ERROR: Error while sending Acknowledgement `, [error]);
    throw new Error(error);
  }
}

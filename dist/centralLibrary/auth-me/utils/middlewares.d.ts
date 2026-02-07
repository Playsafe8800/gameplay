import { AcknowledgeInput, Metrics } from '../../@types';
/**
 *
 * @param client
 * @returns a middleware for socket
 */
export declare function authValidationMid(client: any): (socket: any, next: () => void) => Promise<void>;
/**
 *
 * @param client
 * @returns a Middleware function
 * Check and update the metrics for the client
 */
export declare function metricsOnMid(client: any): (socket: any, next: () => void) => void;
/**
 *
 * @param response the payload to send
 * @optional @param userId userId
 * @optional @param ackRequired in case of broadcasting can be avoided
 * @optional @param tableId User table Id if available
 * @returns payload with metrics binded
 */
export declare function metricsEmitMid(response: {
    [x: string]: any;
    en: string;
}, userId?: string, ackRequired?: boolean, tableId?: string, serverReceiveTime?: string): {
    data: string;
};
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
export declare function ackMid({ success, error, ...data }: AcknowledgeInput, metrics: Metrics, userId: number, tableId: string, ack: (response: string) => void, serverReceiveTime: string): void;

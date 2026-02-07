import { AcknowledgeInput, Metrics } from '../@types';
export declare function ackMid({ success, error, ...data }: AcknowledgeInput, metrics: Metrics, userId: number, tableId: string, ack: (response: string) => void, serverReceiveTime: string, eventName?: string): void;
export declare function metricsEmitMid(response: {
    [x: string]: any;
    en: string;
}, userId?: string, ackRequired?: boolean, tableId?: string, serverReceiveTime?: string): {
    data: string;
};
export declare function metricsOnMid(client: any): (socket: any, next: () => void) => void;

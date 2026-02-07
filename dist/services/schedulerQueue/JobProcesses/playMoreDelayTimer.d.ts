import { Initializer } from '../init';
export declare class PlayMoreDelay extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addPlayMoreDelay: (tableId: string, tableInfo: any, players: any, finalDataGrpc: any, tableConfigData: any) => Promise<void>;
    private readonly playMoreDelayProcess;
    readonly closeWorker: () => Promise<void>;
}

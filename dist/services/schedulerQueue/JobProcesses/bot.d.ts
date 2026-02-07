import { Initializer } from '../init';
export declare class Bot extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addBot: (tableId: string, currentRound: number, timer: number) => Promise<void>;
    private readonly addBotProcess;
    readonly cancelBot: (tableId: string, currentRound: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

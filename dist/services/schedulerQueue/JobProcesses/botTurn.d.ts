import { Initializer } from '../init';
export declare class BotTurn extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addBotTurn: (tableId: string, userId: number, botTurnCount: number, timer: number) => Promise<void>;
    private readonly addBotTurnProcess;
    readonly cancelBotTurn: (tableId: string, userId: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

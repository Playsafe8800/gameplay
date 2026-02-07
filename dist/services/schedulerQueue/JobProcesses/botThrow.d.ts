import { Initializer } from '../init';
export declare class BotThrow extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addBotThrow: (tableId: string, userId: number, timer: number) => Promise<void>;
    private readonly addBotThrowProcess;
    readonly cancelBotThrow: (tableId: string, userId: number) => Promise<void>;
    private getPickedCard;
    private selectAndRemoveNonTrumpCard;
    readonly closeWorker: () => Promise<void>;
}

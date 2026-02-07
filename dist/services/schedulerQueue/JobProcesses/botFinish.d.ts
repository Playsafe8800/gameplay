import { Initializer } from '../init';
export declare class BotFinish extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addBotFinish: (tableId: string, userId: number, timer: number, group: Array<Array<string>>) => Promise<void>;
    private readonly addBotFinishProcess;
    readonly cancelBotFinish: (tableId: string, userId: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

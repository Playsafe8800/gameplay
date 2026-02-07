import { Initializer } from '../init';
export declare class PlayerTurnTimer extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addPlayerTurnTimer: (tableId: string, userId: number, timer: number) => Promise<void>;
    private readonly playerTurnTimerProcess;
    readonly cancelPlayerTurnTimer: (tableId: string, userId: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

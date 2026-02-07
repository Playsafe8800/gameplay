import { Initializer } from '../init';
export declare class FinishTimer extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addFinishTimer: (tableId: string, currentRound: number, userIds: Array<number>, timer: number, forOthers?: boolean) => Promise<void>;
    private readonly finishTimerProcess;
    readonly cancelFinishTimer: (tableId: string, currentRound: number, forOthers?: boolean) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

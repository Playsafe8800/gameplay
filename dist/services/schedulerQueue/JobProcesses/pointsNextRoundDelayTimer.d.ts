import { Initializer } from '../init';
export declare class PointsNextRoundTimerStart extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addPointsNextRoundTimerStart: (tableId: string, currentRound: number) => Promise<void>;
    private readonly pointsNextRoundTimerStartProcess;
    readonly cancelPointsNextRoundTimerStart: (tableId: string, currentRound: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

import { Initializer } from '../init';
export declare class RoundTimerStart extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addRoundTimerStart: (tableId: string, currentRound: number, nextRoundTimer: number, eliminatedPlayers: any, isTableRejoinable: boolean) => Promise<void>;
    private readonly roundTimerStartProcess;
    readonly cancelRoundTimerStart: (tableId: string, currentRound: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

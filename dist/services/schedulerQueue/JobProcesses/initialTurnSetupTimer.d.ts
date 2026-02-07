import { InitialTurnSetup } from '../../../objectModels';
import { Initializer } from '../init';
export declare class InitialTurnSetupTimer extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addInitialTurnSetupTimer: (params: InitialTurnSetup, timer: number) => Promise<void>;
    private readonly initialTurnSetupTimerProcess;
    readonly cancelInitialTurnSetupTimer: (tableId: string, roundNumber: number) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

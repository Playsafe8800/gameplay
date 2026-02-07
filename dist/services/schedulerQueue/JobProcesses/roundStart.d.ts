import { Initializer } from '../init';
export declare class RoundStart extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addRoundStart: (tableId: string, timer: number) => Promise<void>;
    private readonly roundStartProcess;
    readonly cancelRoundStart: (tableId: string) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

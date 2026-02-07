import { Initializer } from '../init';
export declare class KickEliminatedUsers extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addKickEliminatedUsers: (timer: number, tableId: string, eliminatedPlayers: any) => Promise<void>;
    private readonly kickEliminatedUsersProcess;
    readonly closeWorker: () => Promise<void>;
}

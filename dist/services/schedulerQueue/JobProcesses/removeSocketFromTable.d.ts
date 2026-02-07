import { Initializer } from '../init';
export declare class RemoveSocketFromTable extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addRemoveSocketFromTable: (timer: number, tableId: string, socketId: string) => Promise<void>;
    private readonly removeSocketFromTable;
    readonly closeWorker: () => Promise<void>;
}

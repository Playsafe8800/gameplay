import { Initializer } from '../init';
export declare class TableStart extends Initializer {
    private worker;
    constructor();
    getJobId(tableId: string): string;
    readonly addTableStart: (tableId: string, timer: number) => Promise<void>;
    private readonly tableStartProcess;
    readonly cancelTableStart: (tableId: string) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

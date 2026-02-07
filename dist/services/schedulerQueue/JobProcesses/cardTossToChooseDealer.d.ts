import { Initializer } from '../init';
export declare class CardTossToChooseDealer extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addCardTossToChooseDealer: (tableId: string) => Promise<void>;
    private readonly cardTossToChooseDealerProcess;
    readonly cancelAddCardTossToChooseDealer: (tableId: string) => Promise<void>;
    readonly closeWorker: () => Promise<void>;
}

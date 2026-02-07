declare class State {
    private getStateManagementKeyTable;
    private getStateManagementKeyUser;
    getStateTable(tableId: string): Promise<any>;
    getStateUser(tableId: string, userId: number): Promise<any>;
    setStateTable(tableId: string, stateData: any): Promise<void>;
    setStateUser(tableId: string, userId: number, stateData: any): Promise<void>;
}
export declare const stateManagementService: State;
export {};

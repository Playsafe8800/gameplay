declare class InitialiseGame {
    createBattle(tableId: string, playingUsers: Array<any>, tableConfigData: any): Promise<false | {
        tableGameData: {
            seats: {
                _id: any;
                seat: any;
                seatIndex: any;
            }[];
        };
    }>;
    removeInsuficientFundUser(userIds: Array<any>, tableConfigData: any, grpcRes: any): Promise<true | undefined>;
}
export declare const initializeGame: InitialiseGame;
export {};

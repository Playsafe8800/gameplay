import { PlayerGameplay, SplitAcceptRejectReq, SplitPopupReq, SplitPopupRes } from '../../objectModels';
declare class SplitHandler {
    splitPopup(data: SplitPopupReq, socket: any): Promise<SplitPopupRes>;
    handleSplitAcceptReject(data: SplitAcceptRejectReq, socket: any): Promise<any>;
    buildGameDataForSplit(tableData: any, totalSeats: number, playersGameData: PlayerGameplay[]): Promise<void>;
    handleSplitAccept(userId: number, tableConfigData: any): Promise<{
        tableId: any;
        eliminatedUsers: any;
        userId: any;
        username: any;
        playerInfo: any;
        amount: number;
        result: 1;
        isSplitable: any;
        grpcRes: {};
        playersGamePlayData: any[];
        tableGamePlayData: any;
    } | {
        tableId: any;
        eliminatedUsers: any;
        userId: any;
        username: any;
        playerInfo: any;
        amount: number;
        result: 2;
        isSplitable?: undefined;
        grpcRes?: undefined;
        playersGamePlayData?: undefined;
        tableGamePlayData?: undefined;
    } | null>;
    handleSplitReject(userId: number, tableConfigData: any): Promise<void | {
        tableId: any;
        eliminatedUsers: any;
        userId: any;
        username: any;
        playerInfo: any[];
        amount: number;
        result: 0;
    } | null>;
    isTableSplitable(playersGameData: (any | null)[], tableData: any): Promise<any>;
    private getSplitStatus;
}
export declare const splitHandler: SplitHandler;
export {};

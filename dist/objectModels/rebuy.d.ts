export interface RebuyPopupReq {
    tableId: string;
}
export interface RejoinTableReq {
    tableId: string;
    action: boolean;
}
export interface RebuyPopupRes {
    tableId: string;
    message: string;
    seconds: string;
    success?: boolean;
}
export interface RebuyGrpcRes {
    requestId: string;
    error: any;
    isSuccess: boolean;
    playerData: any;
}
export interface RebuyActionRes {
    tableId: string;
    userId: number;
    username: string;
    avatarUrl: string;
    seatIndex: number;
    totalPoints: number;
    totalBootValue: number;
    status: string;
}

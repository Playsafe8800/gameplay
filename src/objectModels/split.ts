export interface SplitPopupReq {
  tableId: string;
}

export interface SplitPopupRes {
  tableId: string;
  message: string;
}

export interface SplitAcceptRejectReq {
  tableId: string;
  splitStatus: string;
}

export interface SplitGrpcRes {
  requestId: string;
  isSuccess: boolean;
  battleStatus: string;
  error: any;
  battlePlayAgainDisabled: boolean;
  playerData: any;
  collusionInfo: any;
  isFinalRound: boolean;
}

export interface SplitInfo {
  tableId: string;
  eliminatedUsers: Array<number>;
  userId: number;
  username?: string;
  amount: number;
  playerInfo: Array<{
    userId: number;
    username?: string;
    splitStatus: number;
    totalPoints: number;
  }>;
  result?: number;
  isSplitable?: any;
  grpcRes?: any;
}

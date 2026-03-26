import { networkParams } from './playerGameplay';
export interface GameTableInfo {
    tableId: string;
    availablePlayers: number;
    gameType: string;
    tableState: string;
    wildCard: string;
    openDeck: Array<string>;
    currentTurn: number;
    dealer: number;
    declarePlayer: number | null;
    potValue: number;
    lobbyId: number;
    group: Array<Array<string>>;
    meld: Array<string>;
    isRebuyApplicable: boolean;
    canPickWildcard: boolean;
    roundFinishedUserIds: Array<number>;
    turnTimer: string;
    currentRound: number;
    isLastScoreBoardEnabled: boolean;
    lastGreyOutCard: string;
    playerInfo: Array<PlayerInfoSchema>;
    tenant: string;
    entryFee?: number;
    roundStatus?: string;
    tableSessionId?: string;
    unitySessionId?: string;
    split?: boolean;
    networkParams?: networkParams;
    maxScore?: number;
    currencyType: string;
    totalRounds?: number;
    standUpUserList: Array<any>;
    showMplWalletInGame: boolean;
}
export interface PlayerInfoSchema {
    userId: number;
    prime: boolean;
    seatIndex: number;
    username: string;
    profilePicture: string;
    status: string;
    totalPoints: number;
    isShowTimeOutMsg: boolean;
    splitStatus?: boolean;
    dropGame?: number;
    tenant?: string;
    userCash: number;
    isAutoDrop: boolean;
}
export interface UserLobbyDetails {
    userId: number;
    lobbyId: number;
    appType?: string;
    sessionId?: string;
    appVersion?: string;
}

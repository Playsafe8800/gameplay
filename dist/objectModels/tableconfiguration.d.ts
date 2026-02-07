export interface TableConfiguration {
    _id: string;
    bootValue: number;
    gameId: number;
    gameStartTimer: number;
    userFinishTimer: number;
    lobbyId: number;
    manualSplit: boolean;
    maximumPoints: number;
    maximumSeat: number;
    minimumSeat: number;
    multiWinner: boolean;
    pileDiscardEnabled: boolean;
    rakePercentage: number;
    currentRound: number;
    shuffleEnabled: boolean;
    userTurnTimer: number;
    isSplitable: boolean;
    rebuyUsed?: boolean;
    isNewGameTableUI?: boolean;
    globalMatchMaking: boolean;
    dealsCount: number;
    mmAlgo: string;
    gameType: string;
    currencyType: string;
    cgsClusterName: string;
    currencyFactor: number;
    isMultiBotEnabled: boolean;
}
export interface TableConfigWinner {
    _id: string;
    currentRound: number;
    rebuyUsed?: boolean;
    maximumPoints: number;
    currencyType: string;
    gameType: string;
    dealsCount: number;
    bootValue: number;
    isNewGameTableUI?: boolean;
    lobbyId: number;
}
export interface TableConfigFinishGame {
    _id: string;
    userFinishTimer: number;
    currentRound: number;
    gameType: string;
    maximumPoints: number;
}
export interface TableConfigDropGame {
    _id: string;
    currentRound: number;
    gameType: string;
    currencyFactor: number;
    lobbyId: number;
    maximumSeat: number;
    maximumPoints: number;
}
export interface LobbyGameConfig {
    MP: number;
    SP: string;
    ESP: number;
    Host: string;
    Rake: number;
    BaseURL: string;
    EntryFee: number;
    MaxPoints: number;
    RummyTips: boolean;
    Round_count?: number;
    ShowEmoji: boolean;
    GameFormat: string;
    MaxPlayers: number;
    MinPlayers: number;
    HideProfile: boolean;
    ManualSplit: boolean;
    RoundShuffle: boolean;
    SocketTimeout: number;
    UserTurnTimer: number;
    GameStartTimer: number;
    MaxPingCounter: number;
    ShowLeaderboard: boolean;
    UserFinishTimer: number;
    Max_player_count: number;
    Min_player_count: number;
    NetworkIndicator: boolean;
    PileDiscardCheck: boolean;
    FestivalUIEnabled: number;
    RequestRetryCount: number;
    RequestRetryDelay: number;
    SocketErrorTimeout: number;
    GameId: number;
    LobbyId: number;
    MaxBonusPercentage: number;
    isNewUI?: boolean;
    globalMatchMaking: boolean;
    mmAlgo: string;
    cgsClusterName: string;
    CurrencyFactor?: number;
    CurrencyId: string;
    isMultiBotEnabled: boolean;
}

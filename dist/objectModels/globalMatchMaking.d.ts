export interface MatchUserRequest {
    userId: number;
    lobbyId: number;
    gameId: number;
    mmAlgo: string;
}
export interface DeregisterRequest {
    userId: number;
    lobbyId: number;
    gameId: number;
    tableId: string;
}

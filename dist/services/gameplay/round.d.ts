import { PlayerGameplay, SeatSchema, UserProfile } from '../../objectModels';
declare class Round {
    startRound(tableId: string): Promise<boolean>;
    startRoundToSendCards(tableId: string): Promise<void>;
    getAllPlayersPGPandSeatsInfo(tableId: string, currentRound: number, maximumPoints: number, seats: Array<SeatSchema>): Promise<{
        playingSeats: SeatSchema[];
        playingGameData: any[];
        eliminatedUsers: any[];
        allPlayerGamePlay: any[];
    }>;
    /**
     * @deprecated
     */
    splitToChunks(array: Array<number>, parts: any): number[][];
    chooseDealer(seats: Array<SeatSchema>, prevDealer: number): {
        dealerId: number;
        dealerIndex: number;
    };
    getNextPlayer(currentTurn: number, allSeats: Array<PlayerGameplay>): number;
    getPreviousPlayer(currentTurn: number, allSeats: Array<any>): any;
    removeBotCards(cards: any, botCards: any): any;
    getRandomCardSequence(cards: any): any;
    distributeCards(tableConfigData: any, playersData: Array<UserProfile>, isFree: boolean): Promise<{
        usersCards: any;
        wildCard: string;
        papluCard: string;
        firstOpenCard: string[];
        shuffledDeck: string[];
    }>;
    shuffleCards(cards: string[]): string[];
    rearrangedSeats(seats: number[], dealerIndex: number): SeatSchema[];
    startUserTurn(tableId: string, currentRound: number, nextTurn: number, playerGamePlays: Array<any>): Promise<void>;
    private startBotTurn;
    saveRoundScoreCardData(tableId: string, winnerData: any): Promise<void>;
    setupInitialTurn(tableId: string, currentRound: number, nextTurn: number, players: Array<number>): Promise<void>;
    createNewRound(tableData: any, tableGameData: any, secondaryTimer: number, usersInfo: Array<UserProfile | null>): Promise<{
        tableGamePlayData: any;
        tableData: void;
    }>;
    createNewRoundPoints(tableData: any, tableGameData: any): Promise<{
        tableGamePlayData: any;
        tableData: any;
    }>;
}
export declare const round: Round;
export {};

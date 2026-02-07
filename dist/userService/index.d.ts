export default class UserService {
    static host: string | undefined;
    static botHost: string | undefined;
    static GET_LOBBY: string;
    static GET_ACTIVE_MATCH: string;
    static USER_AUTH: string;
    static UPDATE_PROFILE: string;
    static WALLET_BALANCE: string;
    static AVAILABLE_BOT: string;
    static ADD_BOT: string;
    static GET_USER_PROFILE: string;
    static CREATE_BATTLE: string;
    static FINISH_BATTLE: string;
    static CANCEL_MATCH: string;
    static PICK: string;
    static DROP: string;
    static THROW: string;
    private static retryRequest;
    static drop(currentCards: string[], wildCard: string, cohorts: number[], openedCard: string, deckCount: number, tableId: string): Promise<{
        shouldDrop: boolean;
        groupCards: any;
    }>;
    static pick(currentCards: string[], openedCard: string, wildCard: string, is_first_turn: boolean, tableId: string): Promise<any>;
    static throw(currentCards: string[], wildCard: string, deckCount: number, opendDeck: string[], tableId: string, rejCards?: string[], pickCards?: string[]): Promise<{
        thrownCard: string;
        isRummy: any;
        groupCards: any;
    }>;
    static getLobby(lobbyId: number): Promise<any>;
    static getActiveMatch(authToken: string): Promise<any>;
    static getUserWallet(authToken: string): Promise<any>;
    static getUserProfile(userId: number): Promise<any>;
    static userAuth(authToken: string): Promise<any>;
    static getAvailableBot(lobbyAmount: any): Promise<any>;
    static generateBot(): Promise<any>;
    static updateProfile(userId: number, options: any): Promise<any>;
    static createBattle(userIds: number[], lobbyId: number, matchId: string): Promise<any>;
    static cancelBattle(matchId: string): Promise<any>;
    static finishBattle(matchId: string, roundId: string, historyS3Id: string, winnersId: number[], usersInfo: Array<usersInfo>, isFinalRound: boolean): Promise<any>;
}
interface usersInfo {
    id: number;
    points: number;
}
export {};

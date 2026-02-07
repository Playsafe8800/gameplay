export interface GameHistoryData {
    _id: string;
    cd: string;
    tbid: string;
    rummyType: string;
    lobbyId: number;
    startingUsersCount: number;
    gameDetails: GameDetails[];
}
interface GameDetails {
    roundNo: number;
    winnerId: number;
    createdOn?: string;
    modifiedOn?: string;
    extra_info?: string;
    turnsDetails: TurnsDetails[];
}
interface TurnsDetails {
    turnNo: number;
    userId: number;
    turnStatus: string;
    startState: string;
    cardPicked: string;
    cardPickSource: string;
    cardDiscarded: string;
    endState: string;
    createdOn: string;
    points: number;
}
declare class GameHistoryUploader {
    private readonly s3;
    private readonly s3Bucket;
    constructor();
    uploadGameHistory(data: GameHistoryData, roundId: number): Promise<string>;
    private constructS3ObjectURL;
}
export declare const awsHelper: GameHistoryUploader;
export {};

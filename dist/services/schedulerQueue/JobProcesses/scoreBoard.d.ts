import { PlayerGameplay } from '../../../objectModels/playerGameplay';
import { Initializer } from '../init';
export declare class ScoreBoard extends Initializer {
    private worker;
    constructor();
    private getJobId;
    readonly addScoreBoard: (tableId: string, currentRound: number, playingPlayers: Array<PlayerGameplay | null>, grpcResponse: any, isNewGameTableUI?: boolean, isPointsRummy?: boolean) => Promise<void>;
    private readonly scoreBoardProcess;
    readonly closeWorker: () => Promise<void>;
}

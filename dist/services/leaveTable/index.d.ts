import { LeaveTableInput, LeaveTableResult } from '../../objectModels';
import { networkParams } from '../../objectModels/playerGameplay';
declare class LeaveTableHandler {
    main(data: LeaveTableInput, userId: number, networkParams?: networkParams): Promise<LeaveTableResult>;
    managePlayerOnLeave(tableConfigurationData: any, tableGameplayData: any, isDeckShuffled: boolean, playerGameData: any | {
        userId: number;
    }): Promise<boolean>;
    private remainingPlayers;
    updateUserLeftPGP(userId: number, tableId: string, roundNumber: number): Promise<void>;
    private updateTGPandPGPandUserProfile;
    private removeFromStandupUsers;
    private leaveTableOnRoundStartedPoints;
}
declare const _default: LeaveTableHandler;
export = _default;

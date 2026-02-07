import { CurrentRoundTurnHistorySchema } from './turnHistory';
import { UserProfile } from './user';
export interface LeaveTableInput {
    tableId: string;
    reason: string;
    isDropNSwitch?: boolean;
}
export interface LeaveTableResult {
    userId: number;
    tableId: string;
    exit?: boolean;
}
export interface SwitchTableInput {
    userId: number;
    tableId: string;
    isDropNSwitch?: boolean;
}
export interface LeaveTableOnRoundStartedPointsInput {
    reason: string | undefined;
    userInfo: UserProfile;
    tableConfigurationData: any;
    tableGameplayData: any;
    playerGamePlay: any;
    currentRoundHistory: CurrentRoundTurnHistorySchema;
    isDropNSwitch: boolean;
}

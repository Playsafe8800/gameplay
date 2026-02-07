import { PlayerGameplay, UserProfile } from '../../objectModels';
export declare function standup(data: {
    userId: number;
    tableId: string;
    reason?: string;
    isDropNStandup?: boolean;
}): Promise<false | undefined>;
export declare function updateTGPandPGPandUserProfile(userId: number, tableId: string, tableConfigurationData: any, tableGameplayData: any, userInfo: UserProfile, gameDidNotStart: boolean, optionalObj?: {
    playerGamePlay?: PlayerGameplay;
    remainingCard?: string;
    lostPoints?: number;
}): Promise<void>;

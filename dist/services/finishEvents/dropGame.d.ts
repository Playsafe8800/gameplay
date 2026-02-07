import { networkParams } from '../../objectModels';
/**
 * Droping user from game (user can't play but will not leave the seat)
 * calculating points for user who dropped
 * This will called when:
 * 1. user finish with invalid declare
 * 2. user click on drop (first drop / middle drop)
 * 3. user's maximum timeout limit reached
 */
export declare function dropGame(data: {
    tableId: string;
    dropAndSwitch?: boolean;
}, client: any, reason?: string, networkParams?: networkParams): Promise<void>;
export declare function handleAutoDrop(data: {
    tableId: string;
    autoDropEnable: boolean;
    dropAndSwitch?: boolean;
}, client: any): Promise<{
    tableId: string;
    autoDropEnable: boolean;
} | undefined>;

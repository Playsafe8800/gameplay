import { PlayerTurnTimerData } from '../../objectModels';
/**
 * - throw card will call it automatically
 * - expire turn
 * - dropGame will call it if current turn player has droped game
 *
 * @param tableId
 */
export declare const changeTurn: (tableId: string) => Promise<void>;
export declare function onTurnExpire(turndata: PlayerTurnTimerData): Promise<void>;

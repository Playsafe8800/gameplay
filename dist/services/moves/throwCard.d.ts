import { networkParams } from '../../objectModels/playerGameplay';
export declare function throwCard(data: {
    tableId: string;
    card: string;
    group: Array<Array<string>>;
}, socket: any, networkParams: networkParams, isBot: boolean): Promise<{
    tableId: string;
    score: number;
    meld: import("../../objectModels").MeldLabel[];
    group: string[][];
    isValid: boolean;
} | undefined>;

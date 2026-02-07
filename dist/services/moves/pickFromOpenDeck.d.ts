import { networkParams } from '../../objectModels/playerGameplay';
export declare const pickFromOpenDeck: (data: {
    tableId: string;
}, socket: any, networkParams: networkParams, isBot: boolean) => Promise<{
    tableId: string;
    card: any;
} | undefined>;

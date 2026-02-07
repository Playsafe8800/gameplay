import { networkParams } from '../../objectModels';
export declare const pickFromClosedDeck: (data: {
    tableId: string;
}, socket: any, networkParams: networkParams, isBot: boolean) => Promise<{
    tableId: string;
    card: any;
} | undefined>;

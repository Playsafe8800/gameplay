import { networkParams } from '../../objectModels/playerGameplay';
export declare function joinBack(data: {
    tableId: string;
}, socket: any, networkParams?: networkParams): Promise<false | {
    signupResponse: {
        userId: any;
        username: any;
        profilePicture: any;
    };
    gameTableInfoData: any[];
} | undefined>;

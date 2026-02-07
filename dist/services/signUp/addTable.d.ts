import { networkParams } from '../../objectModels/playerGameplay';
import { SignUpInterface } from '../../objectModels/requestHandling';
export declare function addTable(signUpData: SignUpInterface, socket: any, networkParams?: networkParams): Promise<{
    signupResponse: {
        userId: number;
        username: string;
        profilePicture: string;
        tenant: string;
    };
    gameTableInfoData: any[];
    tableId: any;
}>;
export declare function sitBotOnTable(tableId: string): Promise<void>;

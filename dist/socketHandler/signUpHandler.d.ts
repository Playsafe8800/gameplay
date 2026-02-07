import { SignUpInterface } from '../objectModels';
import { networkParams } from '../objectModels/playerGameplay';
export declare function signUpHandler(signUpData: SignUpInterface, socket: any, networkParams?: networkParams): Promise<any>;

import { SignUpInterface, PickCardInterface, ThrowCardInterface, DropCardInterface, AutoDropCardInterface, RoundScoreCardDataInterface } from '../objectModels';
export declare function validateAutoDropCardReq(dropCardData: AutoDropCardInterface): void;
export declare function validateSignUp(signUpData: SignUpInterface): void;
export declare function validatePickCardReq(pickCardData: PickCardInterface): void;
export declare function validateThrowCardReq(throwCardData: ThrowCardInterface): void;
export declare function validateDropCardReq(dropCardData: DropCardInterface): void;
export declare function validateLastRoundScoreCardReq(roundScoreCardData: RoundScoreCardDataInterface): void;
export declare function validateLastRoundScoreBoardReq(roundScoreBoardData: RoundScoreCardDataInterface): void;

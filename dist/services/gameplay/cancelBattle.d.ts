import { CancelBattleError, FraudError } from '../../utils/errors';
declare class CancelBattle {
    cancelBattle(tableId: string, cancelBattle: CancelBattleError | FraudError): Promise<boolean>;
    private sendCancelBattlePopup;
    private sendPopUp;
}
export declare const cancelBattle: CancelBattle;
export {};

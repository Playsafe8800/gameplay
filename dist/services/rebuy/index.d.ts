import { RebuyPopupReq, RebuyPopupRes, RejoinTableReq } from '../../objectModels';
declare class RebuyHandler {
    rebuyPopup(data: RebuyPopupReq, socket: any): Promise<RebuyPopupRes>;
    rebuyTable(data: RejoinTableReq, userId: number): Promise<void>;
    private handleRebuyAccept;
    private handleGrpcError;
    private sendPopUp;
    private playerMaxPoints;
    private getMaximumPoints;
}
declare const _default: RebuyHandler;
export = _default;

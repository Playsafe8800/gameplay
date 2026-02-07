import { PopupContent, ButtonConfig, AlertInfo, LoggingDetails } from '../@types';
import * as enums from '../enums';
import { Sender } from './SenderParent/Sender';
export declare class AlertPopup extends Sender {
    constructor();
    /**
     * Insufficient fund popup with exit button
     * @param socket Socket object or socketid
     * @param message message for Insufficient fund error
     * @param reason reason for Insufficient fund error
     * @param logInfo config data for logging purpose, tableId and userId;
     *                apkVersion to identify Generic popup is supported or not.
     */
    InsufficientFundError(socket: any, message: string, reason: enums.INSUFFICIENT_FUND_REASONS, logInfo: LoggingDetails): void;
    /**
     * Insufficient fund popup for Add cash in case of rummy wallet.
     * @param socket Socket object or socketId
     * @param message message for Insufficient fund error
     * @param reason reason for Insufficient fund error enums.INSUFFICIENT_FUND_REASONS
     * @param logInfo Logging purpose config where tableId and userId are mandatory values
     */
    InsufficientFundWithAddCash(socket: any, message: string, reason: enums.INSUFFICIENT_FUND_REASONS, logInfo: LoggingDetails): void;
    /**
     * GameServerError
     * @param socket  Socket object or socketId
     * @param message PopupContent, an Object with title and content
     * @param reason { GAME_SERVER_ERROR_REASONS } reason for Game server error
     * @param logInfo config data for logging purpose, tableId and userId,
     *                apkVersion to identify Generic popup is supported or not.
     * @param errorEventname Based on client implementation provide error popup event name, Default errorEventname = 'ERROR'
     * @param okBtn Optional field when Okay button only required then this option is true; else not required and always shows exit button
     */
    GameServerError(socket: any, message: PopupContent, reason: enums.GAME_SERVER_ERROR_REASONS, logInfo: LoggingDetails, errorEventname?: string, okBtn?: boolean): void;
    /**
     * CustomCommonPopup
     * @param socket Socket Object or socketId
     * @param message title and content of the popup
     * @param logInfo Logging purpose config where tableId and userId errorType and reason are mandatory fields
     * @param PopupOptionsConfig Array of ButtonConfig
     * @param priority popup priority to identify z-index for popup: PopupPriority
     * @param popupType specific popup type if there is any , default will be common popup
     * Note: If method used with older version app, default event sent to the client will be 'ERROR', if not provided.
     */
    CustomCommonPopup(socket: any, message: PopupContent, logInfo: AlertInfo, PopupOptionsConfig: Array<ButtonConfig>, errorEventname?: string, priority?: enums.PopupPriority, popupType?: string, payload?: {
        [key: string]: any;
    }): void;
}
export { ToastPopup } from './Toast';

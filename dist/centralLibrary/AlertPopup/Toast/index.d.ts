import { LoggingDetails, ToastContent } from '../../@types';
import { Sender } from '../SenderParent/Sender';
export declare class ToastPopup extends Sender {
    constructor();
    /**
     * TopToastPopup
     * @param socket Socket Object or socketId
     * @param message content and textColor for toast
     * @param logInfo Logging purpose config where tableId and userId errorType and reason are mandatory fields
     *
     */
    TopToastPopup(socket: any, message: ToastContent, logInfo: LoggingDetails): void;
    /**
     * CenterToastPopup
     * @param socket Socket Object or socketId
     * @param message content and textColor for toast
     * @param logInfo Logging purpose config where tableId and userId errorType and reason are mandatory fields
     *
     */
    CenterToastPopup(socket: any, message: ToastContent, logInfo: LoggingDetails): void;
    private SendToast;
}

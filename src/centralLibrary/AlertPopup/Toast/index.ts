import { CONFIGURABLE_PARAMS, SOCKET_EVENTS } from '../../constants';
import { LoggingDetails, ToastContent } from '../../@types';
import * as enums from '../../enums';
import { Sender } from '../SenderParent/Sender';

export class ToastPopup extends Sender {
  constructor() {
    super();
    this.TopToastPopup = this.TopToastPopup.bind(this);
    this.CenterToastPopup = this.CenterToastPopup.bind(this);
    this.SendToast = this.SendToast.bind(this);
  }

  /**
   * TopToastPopup
   * @param socket Socket Object or socketId
   * @param message content and textColor for toast
   * @param logInfo Logging purpose config where tableId and userId errorType and reason are mandatory fields
   *
   */
  TopToastPopup(
    socket: any,
    message: ToastContent,
    logInfo: LoggingDetails,
  ) {
    this.SendToast(
      socket,
      message,
      logInfo,
      enums.PopupType.TOP_TOAST_POPUP,
    );
  }

  /**
   * CenterToastPopup
   * @param socket Socket Object or socketId
   * @param message content and textColor for toast
   * @param logInfo Logging purpose config where tableId and userId errorType and reason are mandatory fields
   *
   */
  CenterToastPopup(
    socket: any,
    message: ToastContent,
    logInfo: LoggingDetails,
  ) {
    this.SendToast(
      socket,
      message,
      logInfo,
      enums.PopupType.TOAST_POPUP,
    );
  }

  private SendToast(
    socket: any,
    message: ToastContent,
    logInfo: LoggingDetails,
    popupType: enums.PopupType,
  ) {
    const { content, timeout = CONFIGURABLE_PARAMS.TOAST_TIMEOUT } =
      message;
    const data: any = {
      isPopup: true,
      popupType,
      isAutoHide: true,
      hideTimeout: timeout,
      title: content,
    };

    this.sendEvent(SOCKET_EVENTS.GENERIC_POPUP_EVENT, socket, data, {
      ...logInfo,
      error: enums.AlertType.TOAST_ALERT,
    });
  }
}

import {
  BUTTON_TEXT,
  SOCKET_EVENTS,
  POOPUP_MSG,
  CONFIGURABLE_PARAMS,
} from '../constants';
import {
  PopupContent,
  ButtonConfig,
  AlertInfo,
  LoggingDetails,
} from '../@types';
import * as enums from '../enums';
import { Sender } from './SenderParent/Sender';
import { Logger } from '../../newLogger';

export class AlertPopup extends Sender {
  constructor() {
    super();
    this.InsufficientFundError =
      this.InsufficientFundError.bind(this);
    this.GameServerError = this.GameServerError.bind(this);
    this.CustomCommonPopup = this.CustomCommonPopup.bind(this);
    this.InsufficientFundWithAddCash =
      this.InsufficientFundWithAddCash.bind(this);
  }

  /**
   * Insufficient fund popup with exit button
   * @param socket Socket object or socketid
   * @param message message for Insufficient fund error
   * @param reason reason for Insufficient fund error
   * @param logInfo config data for logging purpose, tableId and userId;
   *                apkVersion to identify Generic popup is supported or not.
   */
  InsufficientFundError(
    socket: any,
    message: string,
    reason: enums.INSUFFICIENT_FUND_REASONS,
    logInfo: LoggingDetails,
  ) {
    const data: { [x: string]: any } = {};
    // let eventName: string;
    // if (logInfo.apkVersion && 1000170 < logInfo.apkVersion) {
    Object.assign(data, {
      title: POOPUP_MSG.INSUFFICIENT_FUND,
      isPopup: true,
      popupType: enums.PopupType.COMMON_POPUP,
      message: message,
      isAutoHide: false,
      hideTimeout: CONFIGURABLE_PARAMS.NO_TIMEOUT,
      messageColor: enums.ColorHexCode.WHITE,
      messageSecondary: '',
      messageSecondaryColor: '',
      buttonCounts: 1,
      button_text: [BUTTON_TEXT.EXIT],
      button_color: [enums.Color.GREEN],
      button_methods: [enums.ButtonAction.GOTOLOBBY],
      button_color_hex: [enums.ColorHexCode.GREEN],
      button_text_color_hex: [enums.ColorHexCode.WHITE],
      commonPopupPriority: enums.PopupPriority.MEDIUM,
    });
    const eventName = SOCKET_EVENTS.GENERIC_POPUP_EVENT;
    // } else {
    //   data.msg = message;
    //   data.onlyExitBtn = true;
    //   eventName = SOCKET_EVENTS.INSUFFICIENT_FUND_EVENT;
    // }
    this.sendEvent(eventName, socket, data, {
      ...logInfo,
      error: enums.AlertType.INSUFFICIENT_FUND,
      reason,
    });
  }

  /**
   * Insufficient fund popup for Add cash in case of rummy wallet.
   * @param socket Socket object or socketId
   * @param message message for Insufficient fund error
   * @param reason reason for Insufficient fund error enums.INSUFFICIENT_FUND_REASONS
   * @param logInfo Logging purpose config where tableId and userId are mandatory values
   */
  InsufficientFundWithAddCash(
    socket: any,
    message: string,
    reason: enums.INSUFFICIENT_FUND_REASONS,
    logInfo: LoggingDetails,
  ) {
    const data = {
      onlyExitBtn: false,
      msg: message,
    };
    this.sendEvent(
      SOCKET_EVENTS.INSUFFICIENT_FUND_EVENT,
      socket,
      data,
      {
        ...logInfo,
        error: enums.AlertType.INSUFFICIENT_FUND,
        reason,
      },
    );
  }

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
  GameServerError(
    socket: any,
    message: PopupContent,
    reason: enums.GAME_SERVER_ERROR_REASONS,
    logInfo: LoggingDetails,
    errorEventname = 'ERROR',
    okBtn?: boolean,
  ) {
    const {
      content,
      title,
      textColor = enums.ColorHexCode.WHITE,
      secondaryContent,
      secondaryTextColor = enums.ColorHexCode.YELLOW,
    } = message;
    const data: { [x: string]: any } = {
      title: title || POOPUP_MSG.ALERT,
    };
    let eventName: string = errorEventname;
    if (1000170 < logInfo.apkVersion) {
      eventName = SOCKET_EVENTS.GENERIC_POPUP_EVENT;
      Object.assign(data, {
        isPopup: true,
        popupType: enums.PopupType.COMMON_POPUP,
        isAutoHide: false,
        hideTimeout: CONFIGURABLE_PARAMS.NO_TIMEOUT,
        message: content || POOPUP_MSG.SERVER_ERROR,
        messageColor: textColor,
        messageSecondary: secondaryContent || '',
        messageSecondaryColor: secondaryTextColor,
        buttonCounts: 1,
        button_text: [okBtn ? BUTTON_TEXT.OKAY : BUTTON_TEXT.EXIT],
        button_color: [enums.Color.GREEN],
        button_methods: [
          okBtn
            ? enums.ButtonAction.OKAY
            : enums.ButtonAction.GOTOLOBBY,
        ],
        button_text_color_hex: [enums.ColorHexCode.WHITE],
        button_color_hex: [enums.ColorHexCode.GREEN],
        commonPopupPriority: enums.PopupPriority.MEDIUM,
      });
    } else {
      eventName = errorEventname;
      Object.assign(data, {
        msg: content || POOPUP_MSG.SERVER_ERROR,
        okBtn: !!okBtn,
      });
    }
    this.sendEvent(eventName, socket, data, {
      ...logInfo,
      error: enums.AlertType.GAME_SERVER_ERROR,
      reason,
    });
  }

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
  CustomCommonPopup(
    socket: any,
    message: PopupContent,
    logInfo: AlertInfo,
    PopupOptionsConfig: Array<ButtonConfig>,
    errorEventname = 'ERROR',
    priority?: enums.PopupPriority,
    popupType?: string,
    payload?: { [key: string]: any },
  ) {
    try {
      const {
        content,
        title,
        secondaryContent,
        secondaryTextColor = enums.ColorHexCode.YELLOW,
        textColor = enums.ColorHexCode.WHITE,
      } = message;
      // let data;
      // let eventName;
      // if (logInfo.apkVersion > 1000170) {
      const eventName = SOCKET_EVENTS.GENERIC_POPUP_EVENT;
      const data = {
        isPopup: true,
        popupType: popupType ?? enums.PopupType.COMMON_POPUP,
        isAutoHide: false,
        hideTimeout: CONFIGURABLE_PARAMS.NO_TIMEOUT,
        title: title || POOPUP_MSG.ALERT,
        message: content || logInfo.reason,
        payload: payload,
        messageColor: textColor,
        messageSecondary: secondaryContent || '',
        messageSecondaryColor: secondaryTextColor,
        buttonCounts: PopupOptionsConfig.length,
        button_text: PopupOptionsConfig.map((option) => option.text),
        button_color: PopupOptionsConfig.map(
          (option) => option.color,
        ),
        button_methods: PopupOptionsConfig.map(
          (option) => option.action,
        ),
        button_text_color_hex: PopupOptionsConfig.map(
          (option) => option.text_color || enums.ColorHexCode.WHITE,
        ),
        button_color_hex: PopupOptionsConfig.map(
          (option) => option.color_hex || enums.ColorHexCode.GREEN,
        ),
        commonPopupPriority: priority || enums.PopupPriority.MEDIUM,
      };
      // } else {
      //   eventName = errorEventname;
      //   data = {
      //     title: title || POOPUP_MSG.ALERT,
      //     msg: content || POOPUP_MSG.SERVER_ERROR,
      //     // Exit action found then show Exit button otherwise show Okay button
      //     okBtn: !PopupOptionsConfig.find(
      //       (button) =>
      //         button.action === enums.ButtonAction.GOTOLOBBY,
      //     ),
      //   };
      // }

      this.sendEvent(eventName, socket, data, logInfo);
    } catch (error) {
      Logger.error(`INTERNAL_SERVER_ERROR`,[error]);
    }
  }
}

export { ToastPopup } from './Toast';

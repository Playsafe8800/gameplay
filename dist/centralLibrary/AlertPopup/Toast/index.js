"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastPopup = void 0;
const constants_1 = require("../../constants");
const enums = __importStar(require("../../enums"));
const Sender_1 = require("../SenderParent/Sender");
class ToastPopup extends Sender_1.Sender {
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
    TopToastPopup(socket, message, logInfo) {
        this.SendToast(socket, message, logInfo, enums.PopupType.TOP_TOAST_POPUP);
    }
    /**
     * CenterToastPopup
     * @param socket Socket Object or socketId
     * @param message content and textColor for toast
     * @param logInfo Logging purpose config where tableId and userId errorType and reason are mandatory fields
     *
     */
    CenterToastPopup(socket, message, logInfo) {
        this.SendToast(socket, message, logInfo, enums.PopupType.TOAST_POPUP);
    }
    SendToast(socket, message, logInfo, popupType) {
        const { content, timeout = constants_1.CONFIGURABLE_PARAMS.TOAST_TIMEOUT } = message;
        const data = {
            isPopup: true,
            popupType,
            isAutoHide: true,
            hideTimeout: timeout,
            title: content,
        };
        this.sendEvent(constants_1.SOCKET_EVENTS.GENERIC_POPUP_EVENT, socket, data, Object.assign(Object.assign({}, logInfo), { error: enums.AlertType.TOAST_ALERT }));
    }
}
exports.ToastPopup = ToastPopup;

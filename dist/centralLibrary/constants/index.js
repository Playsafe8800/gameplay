"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIGURABLE_PARAMS = exports.POOPUP_MSG = exports.BUTTON_TEXT = exports.SOCKET_EVENTS = exports.AUTH_CONST = void 0;
exports.AUTH_CONST = Object.freeze({
    ERROR_SOCKET_EVENT: 'ERROR',
    COMMON_ERROR: 'Oops! Something went wrong. Please try again later.',
});
exports.SOCKET_EVENTS = Object.freeze({
    GENERIC_POPUP_EVENT: 'SHOW_POPUP',
    INSUFFICIENT_FUND_EVENT: 'INSUFFICIENT_FUND',
    ERROR: 'ERROR',
    SERVER_ERROR: 'GAME_SERVER_ERROR',
});
exports.BUTTON_TEXT = Object.freeze({
    EXIT: 'EXIT',
    OKAY: 'OKAY',
});
exports.POOPUP_MSG = Object.freeze({
    ALERT: 'Alert!',
    INSUFFICIENT_FUND: 'Insufficient Fund',
    SERVER_ERROR: 'Game Server Error',
});
exports.CONFIGURABLE_PARAMS = Object.freeze({
    TOAST_TIMEOUT: 3,
    NO_TIMEOUT: -1,
});

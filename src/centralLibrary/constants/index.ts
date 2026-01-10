export const AUTH_CONST = Object.freeze({
  ERROR_SOCKET_EVENT: 'ERROR',
  COMMON_ERROR: 'Oops! Something went wrong. Please try again later.',
});

export const SOCKET_EVENTS = Object.freeze({
  GENERIC_POPUP_EVENT: 'SHOW_POPUP',
  INSUFFICIENT_FUND_EVENT: 'INSUFFICIENT_FUND',
  ERROR: 'ERROR',
  SERVER_ERROR: 'GAME_SERVER_ERROR',
});

export const BUTTON_TEXT = Object.freeze({
  EXIT: 'EXIT',
  OKAY: 'OKAY',
});

export const POOPUP_MSG = Object.freeze({
  ALERT: 'Alert!',
  INSUFFICIENT_FUND: 'Insufficient Fund',
  SERVER_ERROR: 'Game Server Error',
});

export const CONFIGURABLE_PARAMS = Object.freeze({
  TOAST_TIMEOUT: 3,
  NO_TIMEOUT: -1,
});

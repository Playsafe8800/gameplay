import {
  LogLevel,
  LogLevelKeys,
  LogLevelsGrpcMapping,
  TransportGrpcMapping,
} from '../@types/LoggerTypes';

/**
 * Internal
 * @param {Object} message object to format
 * @returns {String} in format " key: value, "
 */
export const removeEscapeCharacters = (
  message: any,
  isLast: boolean,
) => {
  // stringify return undefined type when passed undefined, returning empty string instead
  let stringified = message;

  if (typeof stringified !== 'string') {
    stringified = JSON.stringify(message) || '';
    stringified = stringified.replace(/\\/g, '');
  }

  if (!isLast) stringified = stringified.concat(', ');
  return stringified;
};

/**
 *
 * @param {Array} messages containing text to print
 */
export const formatLogMessages = (messages: any[]) => {
  return messages.reduce(
    (val, curr, idx) =>
      (val += removeEscapeCharacters(
        curr,
        idx === messages.length - 1,
      )),
    '',
  );
};

export const getErrorString = (message: any): any => {
  if (!Array.isArray(message)) return message;
  let result = '';
  for (let i = 0; i < message.length; i++) {
    let skip = false;
    if (typeof message[i] === 'object') {
      if (
        // eslint-disable-next-line no-prototype-builtins
        message[i].hasOwnProperty('message') ||
        // eslint-disable-next-line no-prototype-builtins
        message[i].hasOwnProperty('stack')
      ) {
        skip = true;
        result += `${
          !message[i].stack && message[i].message
            ? message[i].message
            : ''
        } ${message[i].stack ? message[i].stack : ''} `;
      }
    }
    if (!skip)
      result += removeEscapeCharacters(
        message[i],
        i === message.length - 1,
      );
  }
  return result;
};

export interface IObject {
  [key: string]: string;
}

export const formatLevelsResponse = (
  type: 'grpc' | 'rest',
  response: IObject,
) => {
  const currentLevels: any = [];
  for (const k in response) {
    if (type === 'grpc') {
      currentLevels.push({
        transport: TransportGrpcMapping[k],
        level: LogLevelsGrpcMapping[response[k]],
      });
    } else {
      currentLevels.push({ transport: k, level: response[k] });
    }
  }

  return { currentLevels };
};

export const getLevelText = (level: string | LogLevel) => {
  switch (level) {
    case LogLevel.DEBUG:
    case LogLevelKeys.DEBUG:
      return LogLevelKeys.DEBUG;
    case LogLevel.WARN:
    case LogLevelKeys.WARN:
      return LogLevelKeys.WARN;
    case LogLevel.INFO:
    case LogLevelKeys.INFO:
      return LogLevelKeys.INFO;
    case LogLevel.ERROR:
    case LogLevelKeys.ERROR:
    default:
      return LogLevelKeys.ERROR;
  }
};

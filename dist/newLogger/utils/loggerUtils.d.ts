import { LogLevel } from '../@types/LoggerTypes';
/**
 * Internal
 * @param {Object} message object to format
 * @returns {String} in format " key: value, "
 */
export declare const removeEscapeCharacters: (message: any, isLast: boolean) => any;
/**
 *
 * @param {Array} messages containing text to print
 */
export declare const formatLogMessages: (messages: any[]) => any;
export declare const getErrorString: (message: any) => any;
export interface IObject {
    [key: string]: string;
}
export declare const formatLevelsResponse: (type: 'grpc' | 'rest', response: IObject) => {
    currentLevels: any;
};
export declare const getLevelText: (level: string | LogLevel) => string;

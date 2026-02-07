import * as enums from '../enums';
export interface Metrics {
    /**
     * uuid: Random UUID
     */
    uuid: string;
    /**
     * ctst: filled by client;
     * timestamp filled when event sent to server or ack sent to server for server event.
     */
    ctst: string;
    /**
     * srct: filled by server;
     * timestamp filled when server receive client sent event or receives ack from client for server sent event.
     */
    srct: string;
    /**
     * srpt: filled by server;
     * timestamp filled when server responds with ack for a client event; or new event sent from server to client.
     */
    srpt: string;
    /**
     * crst: filled by client;
     * timestamp filled when event received from server or ack received from server for client event
     */
    crst: string;
    /** user's MPL Id */
    userId: string;
    /** Client's app version */
    apkVersion: string;
    tableId: string;
}
export interface GRPCAuthResponse {
    error: {
        reason: string;
        message: string;
    };
    isAuthentic: boolean;
    userId: number;
    mobileNumber: string;
    countryCode: string;
}
export interface AcknowledgeInput {
    success: boolean;
    error: {
        errorCode: number;
        errorMessage: string;
        responseType: string;
    } | null;
    [x: string]: any;
}
export interface LibInitParams {
    grpcClientMap: ClientMap;
    socketClient: any;
    zkConfig: () => ZKConfigData;
    Logger: any;
}
export interface ClientMap {
    [x: string]: (appType?: string) => Promise<any>;
}
export interface LoggingDetails {
    userId: string;
    tableId: string;
    apkVersion: number;
    sessionId?: string;
}
export interface AlertInfo extends LoggingDetails {
    error: enums.AlertType;
    reason?: enums.GAME_SERVER_ERROR_REASONS | enums.INSUFFICIENT_FUND_REASONS;
}
export interface TextContent {
    /** Main message to be shown on Popup */
    content: string;
    /**
     * text color for main message (enum ColorHexCode)
     *
     * Default textColor = ColorHexCode.WHITE
     */
    textColor?: enums.ColorHexCode;
}
export interface ToastContent extends TextContent {
    /**
     * autohide toast after time in seconds
     *
     * Default timeout = 3 sec
     */
    timeout?: number;
}
export interface PopupContent extends TextContent {
    /** Title for the popup not required in case of toast */
    title: string;
    /**
     * Secondary message string;
     *
     * Default secondaryContent = ''
     */
    secondaryContent?: string;
    /**
     * Secondary message text color { ColorHexCode }
     *
     * Default secondaryTextColor = ColorHexCode.YELLOW
     */
    secondaryTextColor?: enums.ColorHexCode;
}
/**
 * Button config for Generic popup
 */
export interface ButtonConfig {
    /** @text : Text mentioned on Button */
    text: string;
    /**
     * @color : Color defined from enum
     * @deprecated : for older version only, will be removed from upcoming implementations
     */
    color: enums.Color;
    /** @action : function default available from { ButtonAction } enum or format specific action defined on client can be mentioned here. */
    action: enums.ButtonAction | string;
    /** @color_hex : Color hex code defined with { ColorHexCode } enum for button color */
    color_hex?: enums.ColorHexCode;
    /** @text_color : Color hex code defined with { ColorHexCode } enum for text color on button */
    text_color?: enums.ColorHexCode;
}
export type ZKConfigData = {
    GENERIC_POPUP_BASELINE_VERSION: number;
    [x: string]: any;
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mixpanel_1 = __importDefault(require("mixpanel"));
const logger_1 = __importDefault(require("../logger"));
const { GAMEPLAY_MIXPANEL_TOKEN } = process.env;
let mixpanel;
if (GAMEPLAY_MIXPANEL_TOKEN) {
    mixpanel = mixpanel_1.default.init(GAMEPLAY_MIXPANEL_TOKEN, {
        keepAlive: false,
    });
}
function addMixpanelEvent(event, data) {
    // @ts-ignore
    mixpanel.track(event, data, function (err, dataRes) {
        if (err) {
            logger_1.default.error(`INTERNAL_SERVER_ERROR MIXPANEL_ERROR: event ${event} `, [err]);
        }
        logger_1.default.info(`MIXPANEL: Event ${event} sent, `, [data]);
    });
}
exports.default = addMixpanelEvent;

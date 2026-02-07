"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zkJoiSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const constants_1 = require("../constants");
exports.zkJoiSchema = joi_1.default.object().keys({
    RUMMY_TYPE: joi_1.default.string().default(constants_1.ZKDefaults.RUMMY_TYPE),
    REJOIN_PLAY_TIME: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.REJOIN_PLAY_TIME),
    MAX_TIMEOUT: joi_1.default.number().integer().default(constants_1.ZKDefaults.MAX_TIMEOUT),
    PLAYMORE_POP_TIMER: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.PLAYMORE_POP_TIMER),
    PLAYMORE: joi_1.default.boolean().default(constants_1.ZKDefaults.PLAYMORE),
    REDIS_DEFAULT_EXPIRY: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.REDIS_DEFAULT_EXPIRY)
        .min(constants_1.NUMERICAL.FIFTEEN_MINUTES),
    CARDS_GAME_ARN: joi_1.default.string().uri().optional().allow(''),
    AWS_REGION: joi_1.default.string().default(constants_1.ZKDefaults.AWS_REGION),
    TABLE_MIN_SPLITABLE_POINTS_61: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MIN_SPLITABLE_POINTS_61)
        .min(constants_1.NUMERICAL.THIRTY)
        .max(constants_1.NUMERICAL.SIXTY),
    TABLE_MIN_SPLITABLE_POINTS_101: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MIN_SPLITABLE_POINTS_101)
        .min(constants_1.NUMERICAL.FIFTY)
        .max(constants_1.NUMERICAL.HUNDRED),
    TABLE_MIN_SPLITABLE_POINTS_201: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MIN_SPLITABLE_POINTS_201)
        .min(constants_1.NUMERICAL.HUNDRED_FIFTY)
        .max(constants_1.NUMERICAL.TWO_HUNDRED),
    TABLE_MAX_REJOINABLE_POINTS_61: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MAX_REJOINABLE_POINTS_61),
    TABLE_MAX_REJOINABLE_POINTS_101: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MAX_REJOINABLE_POINTS_101),
    TABLE_MAX_REJOINABLE_POINTS_201: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MAX_REJOINABLE_POINTS_201),
    TABLE_MIN_FAIR_SPLITABLE_POINTS_61: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MIN_FAIR_SPLITABLE_POINTS_61),
    TABLE_MIN_FAIR_SPLITABLE_POINTS_101: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MIN_FAIR_SPLITABLE_POINTS_101),
    TABLE_MIN_FAIR_SPLITABLE_POINTS_201: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MIN_FAIR_SPLITABLE_POINTS_201),
    TABLE_MAX_FAIR_REJOINABLE_POINTS_61: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MAX_FAIR_REJOINABLE_POINTS_61),
    TABLE_MAX_FAIR_REJOINABLE_POINTS_101: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MAX_FAIR_REJOINABLE_POINTS_101),
    TABLE_MAX_FAIR_REJOINABLE_POINTS_201: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.TABLE_MAX_FAIR_REJOINABLE_POINTS_201),
    INSTANT_DEBIT_ENTRY_FEE: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.INSTANT_DEBIT_ENTRY_FEE),
    INSTANT_DEBIT_VALIDATION: joi_1.default.string().default(constants_1.ZKDefaults.INSTANT_DEBIT_VALIDATION),
    VALID_DECLARE_CHECK_LIST: joi_1.default.array()
        .items(joi_1.default.number().integer())
        .default(constants_1.ZKDefaults.VALID_DECLARE_CHECK_LIST),
    GENERIC_POPUP_APK_VERSIONS: joi_1.default.array()
        .items(joi_1.default.number().integer())
        .default(constants_1.ZKDefaults.GENERIC_POPUP_APK_VERSIONS),
    GENERIC_POPUP_BASELINE_VERSION: joi_1.default.number()
        .integer()
        .default(constants_1.ZKDefaults.GENERIC_POPUP_BASELINE_VERSION),
    GAME_TYPE: joi_1.default.string().default(constants_1.ZKDefaults.GAME_TYPE),
    GAME_DATA_KAFKA_TOPIC: joi_1.default.string().default(constants_1.ZKDefaults.GAME_DATA_KAFKA_TOPIC),
    GAME_DATA_KAFKA_PARTITION_KEY: joi_1.default.string().default(constants_1.ZKDefaults.GAME_DATA_KAFKA_PARTITION_KEY),
    CRITERIA_KEY: joi_1.default.string().default(constants_1.ZKDefaults.CRITERIA_KEY),
    CRITERIA_VALUE: joi_1.default.string().default(constants_1.ZKDefaults.CRITERIA_VALUE),
    SHOW_MPL_WALLET_IN_GAME: joi_1.default.boolean().default(constants_1.ZKDefaults.SHOW_MPL_WALLET_IN_GAME),
    DPM: joi_1.default.string().default(constants_1.ZKDefaults.DPM),
    DRM: joi_1.default.string().default(constants_1.ZKDefaults.DRM),
    DRMP: joi_1.default.string().default(constants_1.ZKDefaults.DRMP),
    EM: joi_1.default.string().default(constants_1.ZKDefaults.EM),
    EMM: joi_1.default.string().default(constants_1.ZKDefaults.EMM),
    WMPM: joi_1.default.string().default(constants_1.ZKDefaults.WMPM),
    IPM: joi_1.default.string().default(constants_1.ZKDefaults.IPM),
    PMGL: joi_1.default.string().default(constants_1.ZKDefaults.PMGL),
    PMG: joi_1.default.string().default(constants_1.ZKDefaults.PMG),
    RCP: joi_1.default.string().default(constants_1.ZKDefaults.RCP),
    RJP: joi_1.default.string().default(constants_1.ZKDefaults.RJP),
    IMWPM: joi_1.default.string().default(constants_1.ZKDefaults.IMWPM),
    BATTLE_LIMITER_EXCEEDED: joi_1.default.string().default(constants_1.ZKDefaults.BATTLE_LIMITER_EXCEEDED),
    SFPM: joi_1.default.string().default(constants_1.ZKDefaults.SFPM),
    EPM: joi_1.default.string().default(constants_1.ZKDefaults.EPM),
    RCPM: joi_1.default.string().default(constants_1.ZKDefaults.RCPM),
    ERRM: joi_1.default.string().default(constants_1.ZKDefaults.ERRM),
    ESM: joi_1.default.string().default(constants_1.ZKDefaults.ESM),
    SFM: joi_1.default.string().default(constants_1.ZKDefaults.SFM),
    CNSP: joi_1.default.string().default(constants_1.ZKDefaults.CNSP),
    TTM: joi_1.default.string().default(constants_1.ZKDefaults.TTM),
    AFM: joi_1.default.string().default(constants_1.ZKDefaults.AFM),
    BFM: joi_1.default.string().default(constants_1.ZKDefaults.BFM),
    BAFM: joi_1.default.string().default(constants_1.ZKDefaults.BAFM),
    FSFM: joi_1.default.string().default(constants_1.ZKDefaults.FSFM),
    ISM: joi_1.default.string().default(constants_1.ZKDefaults.ISM),
    LEM: joi_1.default.string().default(constants_1.ZKDefaults.LEM),
    FGFM: joi_1.default.string().default(constants_1.ZKDefaults.FGFM),
    GSDM: joi_1.default.string().default(constants_1.ZKDefaults.GSDM),
    NCPM: joi_1.default.string().default(constants_1.ZKDefaults.NCPM),
    CPM: joi_1.default.string().default(constants_1.ZKDefaults.CPM),
    BCEM: joi_1.default.string().default(constants_1.ZKDefaults.BCEM),
    ADM: joi_1.default.string().default(constants_1.ZKDefaults.ADM),
    TIPS: joi_1.default.array().items(joi_1.default.string()).default(constants_1.ZKDefaults.TIPS),
    INFOTXT: joi_1.default.array()
        .items(joi_1.default.string())
        .default(constants_1.ZKDefaults.INFOTXT),
    IARPM: joi_1.default.string().default(constants_1.ZKDefaults.IARPM),
    GSSP: joi_1.default.string().default(constants_1.ZKDefaults.GSSP),
    FRAUD_USER_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.FRAUD_USER_TEXT),
    FRAUD_ROOM_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.FRAUD_ROOM_TEXT),
    REBUY_POPUP_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.REBUY_POPUP_TEXT),
    REBUY_INVALID_POPUP: joi_1.default.string().default(constants_1.ZKDefaults.REBUY_INVALID_POPUP),
    MM_SERVICE_NAME: joi_1.default.string().required(),
    PLAY_MORE_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.PLAY_MORE_TEXT),
    SEAT_SHUFFLE_MSG: joi_1.default.string().default(constants_1.ZKDefaults.SEAT_SHUFFLE_MSG),
    CARD_SHUFFLE_MSG: joi_1.default.string().default(constants_1.ZKDefaults.CARD_SHUFFLE_MSG),
    GAME_RESUME_MSG: joi_1.default.string().default(constants_1.ZKDefaults.GAME_RESUME_MSG),
    SEGMENT_BLOCKED_USER_TXT: joi_1.default.string().default(constants_1.ZKDefaults.SEGMENT_BLOCKED_USER_TXT),
    MULTI_ACCOUNT_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.MULTI_ACCOUNT_TEXT),
    'kafka.client.kafka-brokers': joi_1.default.string().optional().allow(''),
    kafkaTopic: joi_1.default.array().items(joi_1.default.string()).required(),
    'kafka.client.kafka-security-key': joi_1.default.string()
        .optional()
        .allow(''),
    'kafka.client.kafka-security-secret': joi_1.default.string()
        .optional()
        .allow(''),
    'kafka.client.kafka-security': joi_1.default.boolean().optional().allow(''),
    ELOMMEnabledLobbies: joi_1.default.array().items(joi_1.default.number()).required(),
    PLAYMORE_EXPIRY_RECONNECTION_IN_SECONDS: joi_1.default.number()
        .default(constants_1.ZKDefaults.PLAYMORE_EXPIRY_RECONNECTION_IN_SECONDS)
        .min(constants_1.NUMERICAL.FIVE)
        .max(constants_1.NUMERICAL.HUNDRED),
    DECLARE_POPUP_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.DECLARE_POPUP_TEXT),
    MATCHMAKING_CLUSTERS: joi_1.default.object().required(),
    AUTO_DROP_TITLE: joi_1.default.string().default(constants_1.ZKDefaults.AUTO_DROP_TITLE),
    AUTO_DROP_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.AUTO_DROP_TEXT),
    ELIGIBLE_TIME_BANK_MIN_VERSION: joi_1.default.number()
        .integer()
        .required()
        .min(constants_1.NUMERICAL.FOUR_HUNDRED),
    TIME_BANK_UPDATE_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.TIME_BANK_UPDATE_TEXT),
    POINTS_SWITCH_MSG: joi_1.default.string().default(constants_1.ZKDefaults.POINTS_SWITCH_MSG),
    POINTS_SWITCH_MSG_ROUND_START: joi_1.default.string().default(constants_1.ZKDefaults.POINTS_SWITCH_MSG_ROUND_START),
    TIME_BANK_FIRST_TURN_TEXT: joi_1.default.string().default(constants_1.ZKDefaults.TIME_BANK_FIRST_TURN_TEXT),
    IAP_TITLE: joi_1.default.string().default(constants_1.ZKDefaults.IAP_TITLE),
    IAP_POPUP_MESSAGE: joi_1.default.string().default(constants_1.ZKDefaults.IAP_POPUP_MESSAGE),
    rateLimitingWindowInSeconds: joi_1.default.number()
        .optional()
        .default(constants_1.NUMERICAL.TWENTY)
        .min(constants_1.NUMERICAL.TEN),
    rateLimitingMaxRequests: joi_1.default.number()
        .optional()
        .default(constants_1.NUMERICAL.FIVE)
        .min(constants_1.NUMERICAL.ONE)
        .max(constants_1.NUMERICAL.FIFTY),
    SOCKET_CHECK_ENABLED: joi_1.default.boolean().optional().default(false),
});

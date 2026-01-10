import Joi from 'joi';
import { NUMERICAL, ZKDefaults } from '../constants';
export const zkJoiSchema = Joi.object().keys({
  RUMMY_TYPE: Joi.string().default(ZKDefaults.RUMMY_TYPE),
  REJOIN_PLAY_TIME: Joi.number()
    .integer()
    .default(ZKDefaults.REJOIN_PLAY_TIME),
  MAX_TIMEOUT: Joi.number().integer().default(ZKDefaults.MAX_TIMEOUT),
  PLAYMORE_POP_TIMER: Joi.number()
    .integer()
    .default(ZKDefaults.PLAYMORE_POP_TIMER),
  PLAYMORE: Joi.boolean().default(ZKDefaults.PLAYMORE),
  REDIS_DEFAULT_EXPIRY: Joi.number()
    .integer()
    .default(ZKDefaults.REDIS_DEFAULT_EXPIRY)
    .min(NUMERICAL.FIFTEEN_MINUTES),
  CARDS_GAME_ARN: Joi.string().uri().optional().allow(''),
  AWS_REGION: Joi.string().default(ZKDefaults.AWS_REGION),
  TABLE_MIN_SPLITABLE_POINTS_61: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MIN_SPLITABLE_POINTS_61)
    .min(NUMERICAL.THIRTY)
    .max(NUMERICAL.SIXTY),
  TABLE_MIN_SPLITABLE_POINTS_101: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MIN_SPLITABLE_POINTS_101)
    .min(NUMERICAL.FIFTY)
    .max(NUMERICAL.HUNDRED),
  TABLE_MIN_SPLITABLE_POINTS_201: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MIN_SPLITABLE_POINTS_201)
    .min(NUMERICAL.HUNDRED_FIFTY)
    .max(NUMERICAL.TWO_HUNDRED),
  TABLE_MAX_REJOINABLE_POINTS_61: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MAX_REJOINABLE_POINTS_61),
  TABLE_MAX_REJOINABLE_POINTS_101: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MAX_REJOINABLE_POINTS_101),
  TABLE_MAX_REJOINABLE_POINTS_201: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MAX_REJOINABLE_POINTS_201),
  TABLE_MIN_FAIR_SPLITABLE_POINTS_61: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MIN_FAIR_SPLITABLE_POINTS_61),
  TABLE_MIN_FAIR_SPLITABLE_POINTS_101: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MIN_FAIR_SPLITABLE_POINTS_101),
  TABLE_MIN_FAIR_SPLITABLE_POINTS_201: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MIN_FAIR_SPLITABLE_POINTS_201),
  TABLE_MAX_FAIR_REJOINABLE_POINTS_61: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MAX_FAIR_REJOINABLE_POINTS_61),
  TABLE_MAX_FAIR_REJOINABLE_POINTS_101: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MAX_FAIR_REJOINABLE_POINTS_101),
  TABLE_MAX_FAIR_REJOINABLE_POINTS_201: Joi.number()
    .integer()
    .default(ZKDefaults.TABLE_MAX_FAIR_REJOINABLE_POINTS_201),
  INSTANT_DEBIT_ENTRY_FEE: Joi.number()
    .integer()
    .default(ZKDefaults.INSTANT_DEBIT_ENTRY_FEE),
  INSTANT_DEBIT_VALIDATION: Joi.string().default(
    ZKDefaults.INSTANT_DEBIT_VALIDATION,
  ),
  VALID_DECLARE_CHECK_LIST: Joi.array()
    .items(Joi.number().integer())
    .default(ZKDefaults.VALID_DECLARE_CHECK_LIST),
  GENERIC_POPUP_APK_VERSIONS: Joi.array()
    .items(Joi.number().integer())
    .default(ZKDefaults.GENERIC_POPUP_APK_VERSIONS),
  GENERIC_POPUP_BASELINE_VERSION: Joi.number()
    .integer()
    .default(ZKDefaults.GENERIC_POPUP_BASELINE_VERSION),
  GAME_TYPE: Joi.string().default(ZKDefaults.GAME_TYPE),
  GAME_DATA_KAFKA_TOPIC: Joi.string().default(
    ZKDefaults.GAME_DATA_KAFKA_TOPIC,
  ),
  GAME_DATA_KAFKA_PARTITION_KEY: Joi.string().default(
    ZKDefaults.GAME_DATA_KAFKA_PARTITION_KEY,
  ),

  CRITERIA_KEY: Joi.string().default(ZKDefaults.CRITERIA_KEY),

  CRITERIA_VALUE: Joi.string().default(ZKDefaults.CRITERIA_VALUE),
  SHOW_MPL_WALLET_IN_GAME: Joi.boolean().default(
    ZKDefaults.SHOW_MPL_WALLET_IN_GAME,
  ),
  DPM: Joi.string().default(ZKDefaults.DPM),
  DRM: Joi.string().default(ZKDefaults.DRM),
  DRMP: Joi.string().default(ZKDefaults.DRMP),
  EM: Joi.string().default(ZKDefaults.EM),
  EMM: Joi.string().default(ZKDefaults.EMM),
  WMPM: Joi.string().default(ZKDefaults.WMPM),
  IPM: Joi.string().default(ZKDefaults.IPM),
  PMGL: Joi.string().default(ZKDefaults.PMGL),
  PMG: Joi.string().default(ZKDefaults.PMG),
  RCP: Joi.string().default(ZKDefaults.RCP),
  RJP: Joi.string().default(ZKDefaults.RJP),
  IMWPM: Joi.string().default(ZKDefaults.IMWPM),
  BATTLE_LIMITER_EXCEEDED: Joi.string().default(
    ZKDefaults.BATTLE_LIMITER_EXCEEDED,
  ),
  SFPM: Joi.string().default(ZKDefaults.SFPM),
  EPM: Joi.string().default(ZKDefaults.EPM),
  RCPM: Joi.string().default(ZKDefaults.RCPM),
  ERRM: Joi.string().default(ZKDefaults.ERRM),
  ESM: Joi.string().default(ZKDefaults.ESM),
  SFM: Joi.string().default(ZKDefaults.SFM),
  CNSP: Joi.string().default(ZKDefaults.CNSP),
  TTM: Joi.string().default(ZKDefaults.TTM),
  AFM: Joi.string().default(ZKDefaults.AFM),
  BFM: Joi.string().default(ZKDefaults.BFM),
  BAFM: Joi.string().default(ZKDefaults.BAFM),
  FSFM: Joi.string().default(ZKDefaults.FSFM),
  ISM: Joi.string().default(ZKDefaults.ISM),
  LEM: Joi.string().default(ZKDefaults.LEM),
  FGFM: Joi.string().default(ZKDefaults.FGFM),
  GSDM: Joi.string().default(ZKDefaults.GSDM),
  NCPM: Joi.string().default(ZKDefaults.NCPM),
  CPM: Joi.string().default(ZKDefaults.CPM),
  BCEM: Joi.string().default(ZKDefaults.BCEM),
  ADM: Joi.string().default(ZKDefaults.ADM),
  TIPS: Joi.array().items(Joi.string()).default(ZKDefaults.TIPS),
  INFOTXT: Joi.array()
    .items(Joi.string())
    .default(ZKDefaults.INFOTXT),
  IARPM: Joi.string().default(ZKDefaults.IARPM),
  GSSP: Joi.string().default(ZKDefaults.GSSP),
  FRAUD_USER_TEXT: Joi.string().default(ZKDefaults.FRAUD_USER_TEXT),
  FRAUD_ROOM_TEXT: Joi.string().default(ZKDefaults.FRAUD_ROOM_TEXT),
  REBUY_POPUP_TEXT: Joi.string().default(ZKDefaults.REBUY_POPUP_TEXT),
  REBUY_INVALID_POPUP: Joi.string().default(
    ZKDefaults.REBUY_INVALID_POPUP,
  ),
  MM_SERVICE_NAME: Joi.string().required(),
  PLAY_MORE_TEXT: Joi.string().default(ZKDefaults.PLAY_MORE_TEXT),
  SEAT_SHUFFLE_MSG: Joi.string().default(ZKDefaults.SEAT_SHUFFLE_MSG),
  CARD_SHUFFLE_MSG: Joi.string().default(ZKDefaults.CARD_SHUFFLE_MSG),
  GAME_RESUME_MSG: Joi.string().default(ZKDefaults.GAME_RESUME_MSG),
  SEGMENT_BLOCKED_USER_TXT: Joi.string().default(
    ZKDefaults.SEGMENT_BLOCKED_USER_TXT,
  ),
  MULTI_ACCOUNT_TEXT: Joi.string().default(
    ZKDefaults.MULTI_ACCOUNT_TEXT,
  ),
  'kafka.client.kafka-brokers': Joi.string().optional().allow(''),
  kafkaTopic: Joi.array().items(Joi.string()).required(),
  'kafka.client.kafka-security-key': Joi.string()
    .optional()
    .allow(''),
  'kafka.client.kafka-security-secret': Joi.string()
    .optional()
    .allow(''),
  'kafka.client.kafka-security': Joi.boolean().optional().allow(''),
  ELOMMEnabledLobbies: Joi.array().items(Joi.number()).required(),
  PLAYMORE_EXPIRY_RECONNECTION_IN_SECONDS: Joi.number()
    .default(ZKDefaults.PLAYMORE_EXPIRY_RECONNECTION_IN_SECONDS)
    .min(NUMERICAL.FIVE)
    .max(NUMERICAL.HUNDRED),
  DECLARE_POPUP_TEXT: Joi.string().default(
    ZKDefaults.DECLARE_POPUP_TEXT,
  ),
  MATCHMAKING_CLUSTERS: Joi.object().required(),
  AUTO_DROP_TITLE: Joi.string().default(ZKDefaults.AUTO_DROP_TITLE),
  AUTO_DROP_TEXT: Joi.string().default(ZKDefaults.AUTO_DROP_TEXT),
  ELIGIBLE_TIME_BANK_MIN_VERSION: Joi.number()
    .integer()
    .required()
    .min(NUMERICAL.FOUR_HUNDRED),
  TIME_BANK_UPDATE_TEXT: Joi.string().default(
    ZKDefaults.TIME_BANK_UPDATE_TEXT,
  ),
  POINTS_SWITCH_MSG: Joi.string().default(
    ZKDefaults.POINTS_SWITCH_MSG,
  ),
  POINTS_SWITCH_MSG_ROUND_START: Joi.string().default(
    ZKDefaults.POINTS_SWITCH_MSG_ROUND_START,
  ),
  TIME_BANK_FIRST_TURN_TEXT: Joi.string().default(
    ZKDefaults.TIME_BANK_FIRST_TURN_TEXT,
  ),
  IAP_TITLE: Joi.string().default(ZKDefaults.IAP_TITLE),
  IAP_POPUP_MESSAGE: Joi.string().default(
    ZKDefaults.IAP_POPUP_MESSAGE,
  ),
  rateLimitingWindowInSeconds: Joi.number()
    .optional()
    .default(NUMERICAL.TWENTY)
    .min(NUMERICAL.TEN),
  rateLimitingMaxRequests: Joi.number()
    .optional()
    .default(NUMERICAL.FIVE)
    .min(NUMERICAL.ONE)
    .max(NUMERICAL.FIFTY),
  SOCKET_CHECK_ENABLED: Joi.boolean().optional().default(false),
});

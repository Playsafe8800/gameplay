import { NUMERICAL } from './numerical';

export { CONFIG } from './config';
export { DOUBLE_DECK } from './doubleDeck';
export { ERROR_DETAILS, GRPC_ERRORS } from './errors';
export { EVENTS } from './events';
export { GAME_END_REASONS } from './gameEndReasons';
// export { INSTRUMENTATION_EVENT_REASONS } from './instrumentationEvents';
export { MM_CONSTANTS } from './matchMaking';
export { NUMERICAL } from './numerical';
export { PLAYER_STATE } from './playerState';
export { POOL_TYPES } from './poolTypes';
export { REDIS_CONSTANTS } from './redis';
export { REJOIN_POINTS } from './rejoinPoints';
export { SINGLE_DECK } from './singleDeck';
export { SOCKET } from './socket';
export { TABLE_STATE } from './tableState';
export { TOSS_CARDS } from './tossCards';
export { TURN_HISTORY } from './turnHistory';
export { ZK } from './zk';
export { SET_CARDS } from './cards';
export {DOUBLE_DECK_COMBINATIONS} from './doubleDeckCombinations'
export {SINGLE_DECK_COMBINATIONS} from './singleDeckCombinations'

export const ZKDefaults = Object.freeze({
  RUMMY_TYPE: 'POOL_RUMMY',
  REJOIN_PLAY_TIME: 300,
  MAX_TIMEOUT: 2,
  PLAYMORE_POP_TIMER: 15,
  PLAYMORE: true,
  REDIS_DEFAULT_EXPIRY: 3600,
  AWS_REGION: 'ap-south-1',
  TABLE_MIN_SPLITABLE_POINTS_61: 45,
  TABLE_MIN_SPLITABLE_POINTS_101: 80,
  TABLE_MIN_SPLITABLE_POINTS_201: 175,
  TABLE_MAX_REJOINABLE_POINTS_61: 44,
  TABLE_MAX_REJOINABLE_POINTS_101: 79,
  TABLE_MAX_REJOINABLE_POINTS_201: 174,
  TABLE_MIN_FAIR_SPLITABLE_POINTS_61: 45,
  TABLE_MIN_FAIR_SPLITABLE_POINTS_101: 80,
  TABLE_MIN_FAIR_SPLITABLE_POINTS_201: 175,
  TABLE_MAX_FAIR_REJOINABLE_POINTS_61: 44,
  TABLE_MAX_FAIR_REJOINABLE_POINTS_101: 79,
  TABLE_MAX_FAIR_REJOINABLE_POINTS_201: 174,
  DATA_DUMP_MAX_TIME_SECONDS: 360,
  DISCONNECT_FROM_TABLE_TIMER: 3600,
  INSTANT_DEBIT_ENTRY_FEE: 3,
  INSTANT_DEBIT_VALIDATION: 'INSTANT_DEBIT_VALIDATION',
  VALID_DECLARE_CHECK_LIST: [2, 3, 5],
  GENERIC_POPUP_APK_VERSIONS: [1000170],
  GENERIC_POPUP_BASELINE_VERSION: -1,
  GAME_TYPE: 'deals',
  GAME_DATA_KAFKA_TOPIC: 'sqs-to-kafka-events',
  GAME_DATA_KAFKA_PARTITION_KEY: 'UPDATE_TABLE_GAME_PLAY_HISTORY',
  SHOW_MPL_WALLET_IN_GAME: true,
  CRITERIA_KEY: 'POD_NAME',
  CRITERIA_VALUE: 'CARD-GAMES',
  DPM: 'Are you sure you want to Declare? Note : Selected card will be discarded.',
  DRM: 'You will lose #20.$ Are you sure you want to Drop from the Round?',
  DRMP: 'Drop will be #20.$ You can also go to a new table by dropping and switching.',
  EM: 'You will lose by leaving the Game.$ Are you sure you want to Exit?',
  EMM: 'Are you sure you want to exit?$ Exiting this table will not impact your gameplays in other tables.',
  STM: 'Are you sure you want to Switch the Table?',
  WMPM: 'A Game is in progress, please wait for the next round.',
  IPM: 'Add Cash from MPL Wallet to Continue Playing.',
  PMGL: 'You lost the game.$ Do you want to play another Game?',
  PMG: 'Your last game has ended.$ Do you want to play another Game?',
  RCP: 'Sorry we cannot reconnect you to the game due to poor Internet connection.$Please move to a stable network to resume the game or Exit.',
  RJP: '#20 Rs will be debited from your MPL Wallet.$ Are you sure you want to Rejoin?',
  IMWPM:
    "You don't have sufficient amount in your MPL wallet. Please add money and come back again. Thank you!",
  SFPM: 'Your New game has started as you had enough balance in your MPL Wallet. Note: We have added # from your MPL Wallet.',
  EPM: 'You have been disconnected from the game for a long time. Please contact MPL helpdesk.',
  RCPM: 'You Have no Internet connection. Please re-connect to resume the game.',
  ERRM: 'Oops! Something went wrong. Please try again.',
  ESM: 'Your MPL Wallet has already been credited. Please go to your wallet and check you balance.',
  SFM: 'All seats have been occupied. Please wait for an empty seat or Switch Table.',
  CNSP: 'You can not join in a running game. please wait and try to join the table once the winner is declared!',
  TTM: 'This is your 2nd timeout. Note: Do not stay inactive. Else you will be dropped once your turn ends.',
  AFM: 'Oops! Something went wrong. Please try to join again.',
  BFM: 'There was an error in fetching your account balance. Please try again later!',
  BAFM: 'There was an error while adding cash. Please try again!',
  FSFM: 'There was an error in submitting your score. You will get your money back in 30 minutes. Thank you!',
  ISM: 'You were disconnected from the game because you were detected sitting idle for a long time.',
  LEM: 'This lobby has expired.',
  FGFM: 'Because of a Technical issue, this game has been cancelled. You will get your money back in 30 minutes. Thank you!',
  GSDM: 'There was an error in debiting from your MPL wallet. Please try again later!',
  NCPM: 'Collusion has been detected on this table. The game will be cancelled and your entry fee will be refunded. Players involved in collusion will be blocked.',
  CPM: 'Collusion has been detected in your gameplay. You have been removed from this table and blocked for cheating.',
  BCEM: 'Due to some technical error, this game has been canceled. You will get your money back in 30 minutes. Thank you!',
  ADM: 'Rs. #80 has been added from your MPL wallet to your table wallet to play next game',
  TIPS: [
    'If you are disconnected, you can rejoin and resume the game.',
    'If you do invalid declare, you lose with 80 points',
    "It's better to do a first drop than playing with bad cards and losing more points",
    'If you are facing any issue while playing, rejoining the game would solve most of the issues',
    'If you are inactive you will have 2 Timeouts to comeback to game',
    'If you are Inactive, there will be Max 2 Timeouts',
    'If you exceed 2 Timeouts, you will be dropped and go to stand up mode',
    'If your game is cancelled due to technical issues, you will be refunded for that particular game',
    'If you do not rejoin back before reconnection time, you will lose with point at hand',
    'Your money gets debited only when your game is started.',
  ],
  INFOTXT: [
    'If you are disconnected, you can rejoin and resume the game.',
    'If you do invalid declare, you lose with 80 points',
    "It's better to do a first drop than playing with bad cards and losing more points",
    'If you are facing any issue while playing, rejoining the game would solve most of the issues',
    'If you are inactive you will have 2 Timeouts to comeback to game',
    'If you are Inactive, there will be Max 2 Timeouts',
    'If you exceed 2 Timeouts, you will be dropped and go to stand up mode',
    'If your game is cancelled due to technical issues, you will be refunded for that particular game',
    'If you do not rejoin back before reconnection time, you will lose with point at hand',
    'Your money gets debited only when your game is started.',
  ],
  IARPM:
    'You have been removed from this table because of your inactivity from a long time. Please exit and join again. Thank you!',
  GSSP: 'Game score submission in progress..',
  FRAUD_USER_TEXT:
    'You have been found violating fairplay policies and have been banned from MPL',
  FRAUD_ROOM_TEXT:
    '# have been found violating fairplay policies & have been removed from the table. This game is cancelled and your entry fees is refunded',
  REBUY_POPUP_TEXT:
    '#20 Rs will be debited from your MPL Wallet.$ Are you sure you want to Rejoin?',
  REBUY_INVALID_POPUP: 'Table is not open, please join another table',
  PLAY_MORE_TEXT:
    'Your last game has ended. Do you want to play another Game?',
  SEAT_SHUFFLE_MSG:
    'Seats are being shuffled. Dealer will be assigned as per seating of first round',
  SEGMENT_BLOCKED_USER_TXT:
    "You have mastered the basics of Pool Rummy. It's time to test your skills against other skilled players.",
  MULTI_ACCOUNT_TEXT:
    'You have been found to be accessing multiple MPL accounts from your device. As per MPL Fairplay policies, you are not allowed to play in higher entry fee tables. Please reach out to our Customer Support if you have any questions.',
  DECLARE_POPUP_TEXT:
    'Are you sure you want to Declare? #Current Score: #80 # Note : Selected card will be discarded.',
  AUTO_DROP_TITLE: 'Auto Drop',
  AUTO_DROP_TEXT:
    '20 pts will be added to your score $ Are you sure you want to drop at your turn? ',
  TIME_BANK_UPDATE_TEXT:
    'To get extra time on turn miss, please Update your App. #80 is using extra time from Time bank',
  TIME_BANK_FIRST_TURN_TEXT: '#80 is using extra time from Time bank',
  BATTLE_LIMITER_EXCEEDED:
    'You have played all eligible games as per limiter',
  PLAYMORE_EXPIRY_RECONNECTION_IN_SECONDS: 60,
  IAP_TITLE: 'Popular Gifts',
  IAP_POPUP_MESSAGE:
    'We will be deducting Rs. #80 from the wallet. # Are you sure you want to send the #giftName ?',
  CARD_SHUFFLE_MSG:
    'Please wait while we reshuffle the cards for you...',
  GAME_RESUME_MSG: 'You can continue enjoying your Rummy game now!',
  POINTS_SWITCH_MSG: 'Drop will be #20 pts. You will lose ₹#25.',
  POINTS_SWITCH_MSG_ROUND_START:
    'Are you sure you want to Switch Table?',
});

export const CURRENCY_TYPE = Object.freeze({
  INR: 'INR',
  USD: 'USD',
  COINS: 'COINS',
});

export const BOT_CONFIG = Object.freeze({
  BOT_SET_CARD_ENABLE: true,
  MULTI_BOT_RANGE: "2,3,4",
  BOT_WAITING_TIME_IN_MS: 10000,
  GET_BOT_PROFIT_THRESHOLD: 3000,
  BANNED_USERS_FROM_BOTS: "",
  DELAY_MULTIPLIER: 1.3,
  GIVE_BOT_FAVOR_THRESHOLD: 0,
  DROP_COHORT: "0,1,2,3,4,5,13"
});

export const MESSAGES = {
  NEW_CONNECTION: 'new socket connection.',
  CONNECTED: 'connected',
  NEW_DATA_EVENT: 'new zookeeper data added from path:',
  CONNECTION_ESTABLISHED: 'zookeeper connected successfully.',
  NEW_EVENT: 'new zookeeper event',
  CATCH_ERROR: 'CATCH_ERROR',
};
export const GAME_END_REASONS_INSTRUMENTATION = Object.freeze({
  DROP: 'Drop',
  AUTO_DROP_DROP: 'Auto Drop_Drop',
  MIDDLE_DROP: 'Middle Drop',
  AUDO_MIDDLE_DROP: 'Auto Drop_Middle Drop',
  TIMEOUT_DROP: 'Timeout Drop',
  EXIT: 'Exit',
  LOST: 'lost',
  WINNER: 'Winner',
  INVALID_DECLARE: 'Invalid declare',
  ELIMINATED: 'Eliminated',
});

export const USER_EVENTS = Object.freeze({
  DECLARE: 'DECLARE',
  FINISH: 'FINISH',
  DROP: 'DROP',
  LEFT: 'LEFT',
  PLAYING: 'PLAYING',
});

export const CONNECTION_TYPE = {
  ADD_TABLE: 'ADD_TABLE',
  RECONNECTION: 'RECONNECTION',
  REJOIN: 'REJOIN',
};
export const PM2_ERRORS = {
  KEY_NOT_FOUND: 'KEY_NOT_FOUND',
  KEY_MISMATCHED: 'KEY_MISMATCHED',
  HOSTNAME_MISMATCHED: 'HOSTNAME_MISMATCHED',
  ZK_KEY_MISMATCHED: 'ZK_KEY_MISMATCHED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_EMPTY: 'FILE_EMPTY',
  OTHER: 'OTHER',
  KEYS: {
    SCHEDULER_REDIS_HOST: 'SCHEDULER_REDIS_HOST',
    PUBSUB_REDIS_HOST: 'PUBSUB_REDIS_HOST',
    GAMEPLAY_REDIS_HOST: 'GAMEPLAY_REDIS_HOST',
  },
};

export const LEAVE_TABLE_REASONS = {
  MANUAL_SPLIT: 'MANUAL_SPLIT',
  LOST: 'LOST',
  ELIMINATED: 'ELIMINATED',
  GRPC_FAILED: 'GRPC_FAILED',
  DISCONNECTED_BEFORE_GAME_START: 'DISCONNECTED_BEFORE_GAME_START',
  SWITCH: 'switch',
  NO_BALANCE: 'NO_BALANCE',
  REMOVED_VIA_GLOBAL_MM: 'REMOVED_VIA_GLOBAL_MM',
  AUTO_REMOVABLE_TABLE: 'AUTO_REMOVABLE_TABLE',
  DEBIT_VALIDATION_FAILED: 'DEBIT_VALIDATION_FAILED',
  PLAY_MORE: 'PLAY_MORE',
  REBUYS_EXIT: 'Menu exit yes button',
};

export const DEPLOYMENT_CONSTANTS = {
  CONFIG_FILE_PATH: '/opt/service-config/config.json',
  SERVICE_NAME: 'gameplay-service', // please change
  GENERAL_CLUSTER: 'general',
  LOG_FILE_SIZE: 1073741824,
};

export const TABLE_PREFIX = {
  GAME: 'RPOM',
  GAME_TABLE: 'T',
  PLAYER: 'player',
  TABLE_GAME_PLAY: 'TGP',
  PLAYER_GAME_PLAY: 'PGP',
  TURN_HISTORY: 'HISTORY',
  ROUND_SCORE_CARD: 'RSC',
  ROUND_SCORE_BOARD: 'RSB',
  SPLIT_REQUEST: 'SPLIT',
  OPEN_DISCARDED_CARDS: 'ODC',
  STATE: 'STATE',
  LOBBY: 'LOBBY',
  PLAY_MORE: 'PLAY_MORE',
  INAPP_PURCHASE: 'IAP',
  INAPP_PURCHASE_ELIGIBILITY: 'IAPELIGIBILITY',
};

export const RUMMY_TYPES = {
  POOL: 'pool',
  POINTS: 'points',
  DEALS: 'deals',
  MULTI_TABLE_RUMMY: 'MULTI_TABLE_RUMMY',
  MULTI_TABLE_DEALS_RUMMY: 'DEALS_RUMMY',
  MULTI_TABLE_POOL_RUMMY: 'POOL_RUMMY',
  MULTI_TABLE_POINTS_RUMMY: 'POINTS_RUMMY',
};

export const GAME_IDS = {
  POOL: 1000229,
  DEALS: 1000234,
  POINTS: 1000233,
};

export const PLAYER_STATUS = {
  WINNER: 'winner',
  LOOSER: 'looser',
};

export const POINTS = {
  MAX_DEADWOOD_POINTS: 80,
  MAX_DEADWOOD_POINTS_61: 60,
  FIRST_DROP: 20,
  MIDDLE_DROP: 40,
  FIRST_DROP_201: 25,
  MIDDLE_DROP_201: 50,
  FIRST_DROP_61: 15,
  MIDDLE_DROP_61: 30,
  LATE_DECLARE_PENALTY_POINTS: 2,
  TIMEOUT_DROP: 80,
  MANUAL_LEAVE_PENALTY_POINTS: 160,
};

export const STRINGS = {
  RPOM: 'RPOM',
  RNDM: 'RNDM',
  RNPM: 'RNPM',
  TURN_TIMEOUT: 'TURN_TIMEOUT',
};

export const POPUP_TITLES = {
  ALERT: 'ALERT',
  FAIRPLAY_VIOLATION: 'FAIRPLAY VIOLATION',
  PLAY_MORE: 'PLAY MORE',
  INSUFFICIENT_FUND: 'INSUFFICIENT FUND',
};

export const COUNTRY = {
  IN: 'IN',
};

export const SPLIT = {
  TWO_PLAYER_SPLIT: 'TWO_PLAYER_SPLIT',
  THREE_PLAYER_SPLIT: 'THREE_PLAYER_SPLIT',
  POPUP_MSG: 'Are you sure you want to split?',
};

export const OPEN_POPUP_ACTION = {
  DROP: 'drop',
  DECLARE: 'declare',
  EXIT: 'exit',
};

export const SNS_KEYS = {
  FINISH_TABLE_KEY: 'card-game-finish-table-event-consumer',
};

export const SPLIT_STATUS = {
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  NOT_RESPONDED: 'NOT_RESPONDED',
};

export const DEFAULT_COINTS = {
  COINS: NUMERICAL.HUNDRED,
};

import { Meld } from './cards';

export interface PlayerGameplay {
  userId: number;
  currentCards: Array<string>;
  groupingCards: Array<Array<string>>;
  meld: Array<Meld>;
  lastPickCard: string;
  pickCount: number;
  points: number;
  rank: number;
  seatIndex: number;
  userStatus: string;
  dealPoint: number;
  invalidDeclare: boolean;
  isFirstTurn: boolean;
  isAutoDrop: boolean;
  isAutoDropSwitch: boolean;
  split: number;
  turnCount: number;
  timeoutCount: number;
  useRebuy?: boolean; // useRejoin: It will be true on accepting rebuy
  winLoseStatus?: string;
  networkParams?: networkParams;
  winningCash: number;
  isPlayAgain: boolean;
  isBotWinner: boolean;
  pointRummyAutoDebit?: PointRummyAutoDebitSchema;
  tableSessionId?: string;
  gameEndReason?: string;
  rejectedCards: Array<string>;
  pickedCards: Array<string>;
}
export interface EliminatedPlayerDataSchema extends PlayerGameplay {
  canPlayAgainFailureReason?: string;
  interventionPayload?: InterventionPayload;
}
export interface InterventionPayload {
  reward: string;
  currencyType: string;
  suggestedLobbyId: number;
  suggestedEntryFee: string;
  rewardTitle: string;
  allowSameLobby: boolean;
}

export interface GroupingSchema {
  dwd: Array<Array<string>>;
  pure: Array<Array<string>>;
  seq: Array<Array<string>>;
  set: Array<Array<string>>;
}

export interface PlayerJoined {
  tableId: string;
  availablePlayers: number;
  seatIndex: number;
  userId: number;
  username: string;
  profilePicture: string;
  prime: boolean;
  tableState: string;
  totalPoints: number;
  tenant: string;
  userCash?: number;
}

export interface networkParams {
  eventID: number;
  timeStamp: string;
  retryCount: number;
}

export interface PointRummyAutoDebitSchema {
  isAutoDebitDone: boolean;
  moneyDetail: { amount: number; currencyId: number };
  error: string;
}

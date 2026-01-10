import { CurrentRoundTurnHistorySchema, PlayerGameplay } from './';

export interface SignUpInterface {
  lobbyId?: number;
  connectionType: string;
  tableSessionId?: string;
  unitySessionId?: string;
  gpsLocation?: any;
}

export interface PickCardInterface {
  tableId: string;
}

export interface ThrowCardInterface {
  tableId: string;
  card: string;
  group: Array<Array<string>>;
}

export interface DropCardInterface {
  tableId: string;
}

export interface GroupCardsInterface {
  tableId: string;
  group: Array<Array<string>>;
}

export interface GroupCardsResponseInterface {
  tableId: string;
  score: number;
  meld: Array<string>;
  group: Array<Array<string>>;
  isValid: boolean;
}

export interface DeclareCardRequest {
  tableId: string;
  group: Array<Array<string>>;
  card: string;
}
export interface RoundScoreCardDataInterface {
  tableId: string;
}

export interface CancellationDetails {
  source: string;
  reason: string;
  reasonType: string;
}

export interface scoreDataIF {
  gameEndReason: string;
  lastRoundNo: number;
  lastRoundId: string;
  lastRoundCreatedOn: string;
  roundEndReason: string;
}

export interface UpdateBattleScoreIF {
  requestId: string;
  battleId: string;
  userId: number;
  score: number;
  scoreData: string;
  isFirstScore: boolean;
  partnerKey: string;
  decimalScore: number;
  lobbyId: number;
  sessionId: string;
  roundId: string;
}

export interface UpdateOrFinishRequestIF {
  lobbyId: number;
  tableId: string;
  roundId: string;
  score: Array<UpdateBattleScoreIF>;
  requestId: string;
  isFinalRound: boolean;
  rummyType: string;
  skipDSEventPublish: boolean;
}

export interface FinishBattleDataIF {
  playerGameDataArray: Array<PlayerGameplay>;
  isFinalRound: boolean;
  lobbyId: number;
  battleId: string;
  roundId: string;
  gameType: string;
  winnerId: number;
  roundHistory: CurrentRoundTurnHistorySchema;
  cgsClusterName: string;
  totalPlayerPoints: number;
  maxPoints: number;
}

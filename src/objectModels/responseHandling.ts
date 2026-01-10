import { ScoreBoardPlayerInfoData } from './turnHistory';

export interface PickCardAckInterface {
  tableId: string;
  card: string;
}

export interface PickCardRoomInterface {
  tableId: string;
  userId: number;
}

export interface ThrowCardAckInterface {
  tableId: string;
  score: number;
  meld: Array<string>;
  group: Array<Array<string>>;
  isValid: boolean;
}
export interface AutoDropCardInterface {
  tableId: string;
  autoDropEnable: boolean;
}

export interface ThrowCardRoomInterface {
  tableId: string;
  userId: number;
  card: string;
}

export interface DropCardRoomInterface {
  tableId: string;
  userId: number;
  totalPoints: number;
  status: string;
}

export interface DropCardRoomPointsInterface {
  tableId: string;
  userId: number;
  totalPoints: number;
  status: string;
  potValue: number;
  winningCash: number;
  userCash: number;
}

export interface RoundScoreCardDataAckInterface {
  tableId: string;
  scoreDataList: Array<{ score: number; userId: number }>;
}

export interface RoundScoreBoardDataAckInterface {
  nextRoundTimer: string;
  tableId: string;
  potValue: number;
  tableState: string;
  split?: boolean;
  wildCard: string;
  winnerUserId: number;
  playerInfo: Array<ScoreBoardPlayerInfoData>;
  rebuyable?: boolean;
  round?: number;
  splitAmountPerPlayer?: number;
  splitUsers?: Array<number>;
  tenant: string;
}

export interface StandupRoomInterface {
  tableId: string;
  userId: number;
  totalPoints: number;
  userCash: number;
  potValue: number;
}

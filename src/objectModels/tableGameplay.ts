export interface TableGameplay {
  _id: string;
  closedDeck: Array<string>;
  noOfPlayers: number;
  currentTurn: number;
  declarePlayer: number;
  opendDeck: Array<string>;
  potValue: number;
  seats: Array<SeatSchema>;
  tableState: string;
  trumpCard: string;
  papluCard?: string; // base suit-rank e.g., S-3
  dealerPlayer: number;
  finishPlayer: Array<number>;
  splitCount: number;
  splitUserId: number;
  tie: boolean;
  totalPlayerPoints: number;
  pointsForRoundWinner: number;
  turnCount: number;
  tableCurrentTimer: string;
  rebuyableUsers?: Array<number>;
  isRebuyable: boolean;
  randomWinTurn: number;
  botWinningChecked: boolean;
  botTurnCount: number;
  standupUsers?: Array<StandupUserSchema>;
}

export interface SeatSchema {
  _id: number;
  seatIndex: number;
  seat: number;
  userId?: number;
  sessionId?: string;
}

export interface StandupUserSchema {
  _id: number;
  seat: number;
}

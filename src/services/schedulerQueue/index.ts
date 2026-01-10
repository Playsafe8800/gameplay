import { TableStart } from './JobProcesses/tableStart';
import { RoundStart } from './JobProcesses/roundStart';
import { InitialTurnSetupTimer } from './JobProcesses/initialTurnSetupTimer';
import { PlayerTurnTimer } from './JobProcesses/playerTurnTimer';
import { FinishTimer } from './JobProcesses/finishTimer';
import { ScoreBoard } from './JobProcesses/scoreBoard';
import { PlayMoreDelay } from './JobProcesses/playMoreDelayTimer';
import { RoundTimerStart } from './JobProcesses/roundTimerStart';
import { KickEliminatedUsers } from './JobProcesses/kickEliminatedUsers';
import { CardTossToChooseDealer } from './JobProcesses/cardTossToChooseDealer';
import { RemoveSocketFromTable } from './JobProcesses/removeSocketFromTable';
import { PointsNextRoundTimerStart } from './JobProcesses/pointsNextRoundDelayTimer';
import { Bot } from './JobProcesses/bot';
import { BotTurn } from './JobProcesses/botTurn';
import { BotThrow } from './JobProcesses/botThrow';
import { BotFinish } from './JobProcesses/botFinish';

export class SchedulerJobs {
  private tableStart: TableStart;
  private roundStart: RoundStart;
  private initialTurnSetup: InitialTurnSetupTimer;
  private playerTurnTimer: PlayerTurnTimer;
  private finishTimer: FinishTimer;
  private scoreBoard: ScoreBoard;
  private playMoreDelay: PlayMoreDelay;
  private roundTimerStart: RoundTimerStart;
  private kickEliminatedUsers: KickEliminatedUsers;
  private cardTossToChooseDealer: CardTossToChooseDealer;
  private removeSocketFromTable: RemoveSocketFromTable;
  private pointsNextRoundTimerStart: PointsNextRoundTimerStart;
  private bot: Bot;
  private botTurn: BotTurn;
  private botThrow: BotThrow;
  private botFinish: BotFinish;

  constructor() {
    this.tableStart = new TableStart();
    this.roundStart = new RoundStart();
    this.initialTurnSetup = new InitialTurnSetupTimer();
    this.playerTurnTimer = new PlayerTurnTimer();
    this.finishTimer = new FinishTimer();
    this.scoreBoard = new ScoreBoard();
    this.playMoreDelay = new PlayMoreDelay();
    this.roundTimerStart = new RoundTimerStart();
    this.kickEliminatedUsers = new KickEliminatedUsers();
    this.cardTossToChooseDealer = new CardTossToChooseDealer();
    this.removeSocketFromTable = new RemoveSocketFromTable();
    this.pointsNextRoundTimerStart = new PointsNextRoundTimerStart();
    this.bot = new Bot();
    this.botTurn = new BotTurn();
    this.botThrow = new BotThrow();
    this.botFinish = new BotFinish();
  }

  get addJob() {
    return {
      tableStart: this.tableStart.addTableStart,
      roundStart: this.roundStart.addRoundStart,
      initialTurnSetup:
        this.initialTurnSetup.addInitialTurnSetupTimer,
      playerTurnTimer: this.playerTurnTimer.addPlayerTurnTimer,
      finishTimer: this.finishTimer.addFinishTimer,
      scoreBoard: this.scoreBoard.addScoreBoard,
      playMoreDelay: this.playMoreDelay.addPlayMoreDelay,
      roundTimerStart: this.roundTimerStart.addRoundTimerStart,
      kickEliminatedUsers:
        this.kickEliminatedUsers.addKickEliminatedUsers,
      cardTossToChooseDealer:
        this.cardTossToChooseDealer.addCardTossToChooseDealer,
      addRemoveSocketFromTable:
        this.removeSocketFromTable.addRemoveSocketFromTable,
      pointsNextRoundTimerStart:
        this.pointsNextRoundTimerStart.addPointsNextRoundTimerStart,
      bot: this.bot.addBot,
      botTurn: this.botTurn.addBotTurn,
      botThrow: this.botThrow.addBotThrow,
      botFinish: this.botFinish.addBotFinish,
    };
  }

  get cancelJob() {
    return {
      tableStart: this.tableStart.cancelTableStart,
      roundStart: this.roundStart.cancelRoundStart,
      bot: this.bot.cancelBot,
      botTurn: this.botTurn.cancelBotTurn,
      botThrow: this.botThrow.cancelBotThrow,
      botFinish: this.botFinish.cancelBotFinish,
      initialTurnSetup:
        this.initialTurnSetup.cancelInitialTurnSetupTimer,
      playerTurnTimer: this.playerTurnTimer.cancelPlayerTurnTimer,
      finishTimer: this.finishTimer.cancelFinishTimer,
      roundTimerStart: this.roundTimerStart.cancelRoundTimerStart,
      pointsNextRoundTimerStart:
        this.pointsNextRoundTimerStart
          .cancelPointsNextRoundTimerStart,
    };
  }

  async closeWorkers() {
    await Promise.all([
      this.tableStart.closeWorker(),
      this.roundStart.closeWorker(),
      this.initialTurnSetup.closeWorker(),
      this.playerTurnTimer.closeWorker(),
      this.finishTimer.closeWorker(),
      this.scoreBoard.closeWorker(),
      this.playMoreDelay.closeWorker(),
      this.roundTimerStart.closeWorker(),
      this.kickEliminatedUsers.closeWorker(),
      this.cardTossToChooseDealer.closeWorker(),
      this.removeSocketFromTable.closeWorker(),
      this.pointsNextRoundTimerStart.closeWorker(),
      this.bot.closeWorker(),
      this.botTurn.closeWorker(),
      this.botThrow.closeWorker(),
      this.botFinish.closeWorker(),
    ]);
  }
}

export const scheduler = new SchedulerJobs();

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = exports.SchedulerJobs = void 0;
const tableStart_1 = require("./JobProcesses/tableStart");
const roundStart_1 = require("./JobProcesses/roundStart");
const initialTurnSetupTimer_1 = require("./JobProcesses/initialTurnSetupTimer");
const playerTurnTimer_1 = require("./JobProcesses/playerTurnTimer");
const finishTimer_1 = require("./JobProcesses/finishTimer");
const scoreBoard_1 = require("./JobProcesses/scoreBoard");
const playMoreDelayTimer_1 = require("./JobProcesses/playMoreDelayTimer");
const roundTimerStart_1 = require("./JobProcesses/roundTimerStart");
const kickEliminatedUsers_1 = require("./JobProcesses/kickEliminatedUsers");
const cardTossToChooseDealer_1 = require("./JobProcesses/cardTossToChooseDealer");
const removeSocketFromTable_1 = require("./JobProcesses/removeSocketFromTable");
const pointsNextRoundDelayTimer_1 = require("./JobProcesses/pointsNextRoundDelayTimer");
const bot_1 = require("./JobProcesses/bot");
const botTurn_1 = require("./JobProcesses/botTurn");
const botThrow_1 = require("./JobProcesses/botThrow");
const botFinish_1 = require("./JobProcesses/botFinish");
class SchedulerJobs {
    constructor() {
        this.tableStart = new tableStart_1.TableStart();
        this.roundStart = new roundStart_1.RoundStart();
        this.initialTurnSetup = new initialTurnSetupTimer_1.InitialTurnSetupTimer();
        this.playerTurnTimer = new playerTurnTimer_1.PlayerTurnTimer();
        this.finishTimer = new finishTimer_1.FinishTimer();
        this.scoreBoard = new scoreBoard_1.ScoreBoard();
        this.playMoreDelay = new playMoreDelayTimer_1.PlayMoreDelay();
        this.roundTimerStart = new roundTimerStart_1.RoundTimerStart();
        this.kickEliminatedUsers = new kickEliminatedUsers_1.KickEliminatedUsers();
        this.cardTossToChooseDealer = new cardTossToChooseDealer_1.CardTossToChooseDealer();
        this.removeSocketFromTable = new removeSocketFromTable_1.RemoveSocketFromTable();
        this.pointsNextRoundTimerStart = new pointsNextRoundDelayTimer_1.PointsNextRoundTimerStart();
        this.bot = new bot_1.Bot();
        this.botTurn = new botTurn_1.BotTurn();
        this.botThrow = new botThrow_1.BotThrow();
        this.botFinish = new botFinish_1.BotFinish();
    }
    get addJob() {
        return {
            tableStart: this.tableStart.addTableStart,
            roundStart: this.roundStart.addRoundStart,
            initialTurnSetup: this.initialTurnSetup.addInitialTurnSetupTimer,
            playerTurnTimer: this.playerTurnTimer.addPlayerTurnTimer,
            finishTimer: this.finishTimer.addFinishTimer,
            scoreBoard: this.scoreBoard.addScoreBoard,
            playMoreDelay: this.playMoreDelay.addPlayMoreDelay,
            roundTimerStart: this.roundTimerStart.addRoundTimerStart,
            kickEliminatedUsers: this.kickEliminatedUsers.addKickEliminatedUsers,
            cardTossToChooseDealer: this.cardTossToChooseDealer.addCardTossToChooseDealer,
            addRemoveSocketFromTable: this.removeSocketFromTable.addRemoveSocketFromTable,
            pointsNextRoundTimerStart: this.pointsNextRoundTimerStart.addPointsNextRoundTimerStart,
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
            initialTurnSetup: this.initialTurnSetup.cancelInitialTurnSetupTimer,
            playerTurnTimer: this.playerTurnTimer.cancelPlayerTurnTimer,
            finishTimer: this.finishTimer.cancelFinishTimer,
            roundTimerStart: this.roundTimerStart.cancelRoundTimerStart,
            pointsNextRoundTimerStart: this.pointsNextRoundTimerStart
                .cancelPointsNextRoundTimerStart,
        };
    }
    closeWorkers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
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
        });
    }
}
exports.SchedulerJobs = SchedulerJobs;
exports.scheduler = new SchedulerJobs();

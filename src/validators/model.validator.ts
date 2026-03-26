import Joi from 'joi';
import { Logger } from '../newLogger';
import { DOUBLE_DECK } from '../constants/doubleDeck';
import { PLAYER_STATE } from '../constants/playerState';
import { TABLE_STATE } from '../constants/tableState';
import { OpenDiscardedCards } from '../objectModels/openDiscardedCards';
import { PlayerGameplay } from '../objectModels/playerGameplay';
import { UserProfile } from '../objectModels/user';

export function tableGameplayValidator(
  tableGameplayData: any,
) {
  try {
    Joi.assert(
      tableGameplayData,
      Joi.object().keys({
        _id: Joi.string().description('unique object id'),
        closedDeck: Joi.array()
          .items(Joi.string())
          .default([])
          .description('game play closed deck/cards')
          .required(),
        noOfPlayers: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('number of players')
          .required(),
        currentTurn: Joi.number()
          .allow(null)
          .description(
            'player who has current turn, refrence taken from userProfile playerId field ',
          )
          .required(),
        declarePlayer: Joi.number()
          .allow(null)
          .description(
            'declare player, refrence taken from userProfile playerId field ',
          ),
        opendDeck: Joi.array()
          .items(Joi.string())
          .default([])
          .description('game play opend deck/cards')
          .required(),
        potValue: Joi.number()
          .greater(-1)
          .default(0)
          .allow(null)
          .description('entry fees'),
        pointsForRoundWinner: Joi.number()
          .default(0)
          .description('points stored for round winner ')
          .required(),
        roundNumber: Joi.number()
          .allow(null, 1)
          .description('round number of the game '),
        seats: Joi.array()
          .default([])
          .description('seats defining seat indexes')
          .required(),
        tableState: Joi.string()
          .default(TABLE_STATE.WAITING_FOR_PLAYERS)
          .valid(
            TABLE_STATE.WAITING_FOR_PLAYERS,
            TABLE_STATE.ROUND_TIMER_STARTED,
            TABLE_STATE.LOCK_IN_PERIOD,
            TABLE_STATE.COLLECTING_BOOT_VALUE,
            TABLE_STATE.CARDS_DEALT,
            TABLE_STATE.ROUND_STARTED,
            TABLE_STATE.DECLARED,
            TABLE_STATE.ROUND_WINNER_DECLARED,
            TABLE_STATE.WINNER_DECLARED,
            TABLE_STATE.PLAY_MORE,
            TABLE_STATE.WINNER_DECLARED_TIE,
          )
          .description('table state')
          .required(),
        trumpCard: Joi.string()
          .allow(null, '')
          .description('wild card')
          .valid(...DOUBLE_DECK)
          .required(),
        dealerPlayer: Joi.number()
          .allow(null)
          .description(
            'dealer player, refrence taken from userProfile playerId field ',
          )
          .required(),
        finishPlayer: Joi.array()
          .items(Joi.number().description('playerId'))
          .default([])
          .description(
            ' , refrence taken from userProfile playerId field ',
          )
          .required(),
        splitCount: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('split count'),
        splitUserId: Joi.number()
          .allow(null)
          .description('split user id'),
        tie: Joi.boolean()
          .default(false)
          .description('table game play has been tie'),
        totalPlayerPoints: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('total player points'),
        turnCount: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('turn count')
          .required(),
        tableCurrentTimer: Joi.string()
          .allow(null, '')
          .description('table current timer')
          .required(),
        rebuyableUsers: Joi.array()
          .items(Joi.number())
          .default([])
          .description('rebuyable users')
          .optional(),
        standupUsers: Joi.array()
          .default([])
          .description('standup/audience users')
          .optional(),
        randomWinTurn: Joi.number().default(0).optional(),
        botWinningChecked: Joi.boolean().default(false).optional(),
        botTurnCount: Joi.number().default(0).optional(),
        isRebuyable: Joi.boolean()
          .default(false)
          .description('table game play is rebuyable'),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at tableGameplay req validation for `,
      [tableGameplayData, error],
    );
    throw new Error(error);
  }
}

export function userProfileValidator(userProfileData: UserProfile) {
  try {
    Joi.assert(
      userProfileData,
      Joi.object()
        .keys({
          id: Joi.number()
            .description('user id of the user')
            .required(),
          displayName: Joi.string()
            .description('display name for the user')
            .allow(null)
            .required(),
          avatarUrl: Joi.string()
            .description('profile picture of the user')
            .allow(null)
            .required(),
          userName: Joi.string()
            .allow(null)
            .description('user name of ther user')
            .required(),
          isPrime: Joi.boolean().default(false).required(),
          socketId: Joi.string()
            .description('socket id for the user ')
            .required(),
          tableIds: Joi.array()
            .items(Joi.string())
            .default([])
            .description('table ids for a user')
            .required(),
          tenant: Joi.string()
            .description('tenant of the user')
            .allow(null)
            .required(),
          userTablesCash: Joi.array()
            .default([])
            .description('user cash details as per tables')
            .required(),
        })
        .unknown(true),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at userProfileValidator req validation for `,
      [userProfileData, error],
    );
    throw new Error(error);
  }
}

export function playerGameplayValidator(
  playerGameplayData: PlayerGameplay,
) {
  try {
    Joi.assert(
      playerGameplayData,
      Joi.object().keys({
        userId: Joi.number()
          .description('user id of the user')
          .required(),
        currentCards: Joi.array()
          .default([])
          .description('player current cards')
          .required(),
        groupingCards: Joi.array()
          .items(Joi.array())
          .default([])
          .description('table ids for a user')
          .required(),
        meld: Joi.array()
          .items(Joi.string())
          .default([])
          .description('table ids for a user')
          .required(),
        lastPickCard: Joi.string()
          .allow('')
          .default('')
          .description('last card pick count')
          .required(),
        pickCount: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('card pick count')
          .required(),
        points: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('point to be multiplied with bootvalue')
          .required(),
        rank: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('rank')
          .required(),
        seatIndex: Joi.number()
          .integer()
          .greater(-1)
          .description('seat Index')
          .required(),
        userStatus: Joi.string()
          .valid(
            PLAYER_STATE.DROP,
            PLAYER_STATE.FINISH,
            PLAYER_STATE.LEFT,
            PLAYER_STATE.LOST,
            PLAYER_STATE.PLAYING,
            PLAYER_STATE.WON,
            PLAYER_STATE.DECLARED,
            PLAYER_STATE.PLAY_MORE,
          )
          .description('player status')
          .required(),
        dealPoint: Joi.number()
          .integer()
          .default(0)
          .description('dp')
          .required(),
        invalidDeclare: Joi.boolean()
          .default(false)
          .description('invalide declare status'),
        isFirstTurn: Joi.boolean()
          .default(false)
          .description('player has first turn in a table')
          .required(),
        split: Joi.number()
          .default(2)
          .description(
            'split 0 is reject, 1 is accept, 2 is neither of two',
          )
          .required(),
        turnCount: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('timeout count')
          .required(),
        timeoutCount: Joi.number()
          .integer()
          .greater(-1)
          .default(0)
          .description('player turn timeout')
          .required(),
        useRebuy: Joi.boolean()
          .default(false)
          .description('useRebuy for the player')
          .optional(),
        networkParams: Joi.object(),
        winningCash: Joi.number()
          .default(0)
          .description('winning cash amount'),
        isPlayAgain: Joi.boolean()
          .default(true)
          .description('user canPlayAgain after round completion')
          .optional(),
        pointRummyAutoDebit: Joi.object()
          .description('auto bebit amount')
          .optional(),
        tableSessionId: Joi.string()
          .default('')
          .allow('')
          .description('tableSessionId getting from unity side')
          .optional(),
        gameEndReason: Joi.string()
          .default('')
          .description('gameEndReason to be passed to CGS')
          .optional(),
        isAutoDrop: Joi.boolean()
          .default(false)
          .description('auto drop feature'),
        isAutoDropSwitch: Joi.boolean()
          .default(false)
          .description('auto drop switch feature')
          .optional(),
        isNewUI: Joi.boolean(),
        isBotWinner: Joi.boolean()
          .default(false)
          .description('isBotWinner ')
          .optional(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at playerGameplayValidator req validation for `,
      [playerGameplayData, error],
    );
    throw new Error(error);
  }
}

export function openDiscardedCardsValidator(
  OpenDiscardedCardsData: OpenDiscardedCards,
) {
  try {
    Joi.assert(
      OpenDiscardedCardsData,
      Joi.object().keys({
        openCards: Joi.array()
          .items(
            Joi.object()
              .keys({
                userId: Joi.number()
                  .description('user id of the user')
                  .required(),
                card: Joi.string()
                  .valid(...DOUBLE_DECK)
                  .description('throw card')
                  .required(),
              })
              .unknown(true),
          )
          .description('discarded cards with userId')
          .required(),
      }),
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at OpenDiscardedCards req validation for `,
      [OpenDiscardedCardsData, error],
    );
    throw new Error(error);
  }
}

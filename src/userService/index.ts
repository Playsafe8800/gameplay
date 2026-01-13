import axios, { AxiosResponse } from 'axios';
import { Logger } from '../newLogger';
import { CancelBattleError, InternalError } from '../utils/errors';
import {
  dropInputFormator,
  dropOutPutFormator,
  pickInputFormator,
  throwInputFormator,
  throwOutPutFormator
} from "./helper";

axios.defaults.timeout = 10000;
const defaultToken = process.env.DEFAULT_USER_SERVICE_TOKEN;

export default class UserService {
  static host = process.env.USER_SERVICE_URL;
  static botHost = process.env.BOT_SERVICE_URL;

  static GET_LOBBY = '/lobby';
  static GET_ACTIVE_MATCH = '/user/activeMatch';
  static USER_AUTH = '/user/auth';
  static UPDATE_PROFILE = '/internal/updateProfile/?';
  static WALLET_BALANCE = '/user/wallet';
  static AVAILABLE_BOT = '/internal/bot/available';
  static ADD_BOT = '/add/bots';
  static GET_USER_PROFILE = '/internal/v2/?/profile';
  static CREATE_BATTLE = '/v2/match/create';
  static FINISH_BATTLE = '/v2/match/finish';
  static CANCEL_MATCH = '/v2/match/cancel';
  static PICK = '/pick';
  static DROP = '/drop';
  static THROW = '/get_throw_multi_deck';

  private static async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    url: string,
    maxRetries: number = 5,
  ): Promise<AxiosResponse<T>> {
    let lastError: any = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        const status = error?.response?.status;
        const isRetryableStatus = status >= 500;
        const isNetworkError = [
          'ECONNABORTED',
          'ERR_NETWORK',
          'ETIMEDOUT',
          'ECONNRESET',
          'ENOTFOUND',
          'ECONNREFUSED',
        ].includes(error.code);
        lastError = new InternalError(error.message, error);
        if (
          (isRetryableStatus || isNetworkError) &&
          attempt < maxRetries - 1
        ) {
          Logger.info(`retryRequest `, [
            attempt,
            url,
            `status: ${status}`,
          ]);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  static async drop(
    currentCards: string[],
    wildCard: string,
    cohorts: number[],
    openedCard: string,
    deckCount: number,
    tableId: string,
  ) {
    try {
      const { hand, jokerRank, topCard } = dropInputFormator(
        currentCards,
        wildCard,
        openedCard,
      );
      const handIds = hand.map((card) => card.id);
      const topCardId = topCard.id;
      Logger.info('DropInputBotService:- ', [
        tableId,
        {
          hand: handIds,
          joker_rank: jokerRank,
          cohorts,
          deck_cnt: deckCount,
        },
      ]);
      const url = `${this.botHost}${this.DROP}`;
      const userInfo = await this.retryRequest(
        () =>
          axios.post(url, {
            hand: handIds,
            joker_rank: jokerRank,
            cohort_array: cohorts,
            deck_cnt: deckCount,
          }),
        url,
      );
      Logger.info('DropOutputBotService: ', [tableId, userInfo.data]);
      return dropOutPutFormator(userInfo.data, hand);
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR_drop`, [e, tableId]);
      throw e;
    }
  }

  static async pick(
    currentCards: string[],
    openedCard: string,
    wildCard: string,
    is_first_turn: boolean,
    tableId: string,
  ) {
    try {
      const { hand, topCard, jokerRank } = pickInputFormator(
        currentCards,
        openedCard,
        wildCard,
      );
      const handIds = hand.map((card) => card.id);
      const topCardId = topCard.id;

      Logger.info('PickInputBotService:- ', [
        tableId,
        {
          hand: handIds,
          top_card_id: topCardId,
          joker_rank: jokerRank,
          is_first_turn: is_first_turn ? 1 : 0,
        },
      ]);
      const url = `${this.botHost}${this.PICK}`;
      const userInfo = await this.retryRequest(
        () =>
          axios.post(url, {
            hand: handIds,
            top_card_id: topCardId,
            joker_rank: jokerRank,
            is_first_turn: is_first_turn ? 1 : 0,
          }),
        url,
      );
      Logger.info('PickOutputBotService:- ', [
        tableId,
        userInfo.data,
      ]);
      return userInfo.data['should_pick'];
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR_pick`, [e, tableId]);
      throw e;
    }
  }

  static async throw(
    currentCards: string[],
    wildCard: string,
    deckCount: number,
    opendDeck: string[],
    tableId: string,
    rejCards?: string[],
    pickCards?: string[],
  ) {
    try {
      Logger.info('RawThrowInputBotService:- ', [
        tableId,
        {
          currentCards,
          wildCard,
          deckCount,
          opendDeck,
          rejCards,
          pickCards,
        },
      ]);
      const { hand, jokerRank, p_array, rejectedCards, pickedCards } =
        throwInputFormator(
          currentCards,
          wildCard,
          opendDeck,
          rejCards,
          pickCards,
        );
      const handIds = hand.map((c) => c.id);
      const pArrayIds = p_array.map((c) => c.id);
      const rejectedCardIds = rejectedCards?.map((c) => c.id);
      const pickedCardIds = pickedCards?.map((c) => c.id);

      Logger.info('ThrowInputBotService:- ', [
        tableId,
        {
          hand: handIds,
          joker_rank: jokerRank,
          deck_cnt: deckCount,
          p_array: pArrayIds,
          rejectedCards: rejectedCardIds,
          pickedCards: pickedCardIds,
        },
      ]);

      const sendingObj = rejCards
        ? {
            hand: handIds,
            joker_rank: jokerRank,
            deck_cnt: deckCount,
            p_array: pArrayIds,
            rejected_array: rejectedCardIds,
            picked_array: pickedCardIds,
          }
        : {
            hand: handIds,
            joker_rank: jokerRank,
            deck_cnt: deckCount,
            p_array: pArrayIds,
          };

      const url = `${this.botHost}${this.THROW}`;
      const userInfo = await this.retryRequest(
        () => axios.post(`${this.botHost}${this.THROW}`, sendingObj),
        url,
      );
      Logger.info('ThrowOutputBotService: ', [
        tableId,
        userInfo.data,
      ]);
      const { thrownCard, groupCards } = throwOutPutFormator(
        userInfo.data,
        hand,
      );
      Logger.info('RawThrowOutputBotService: ', [
        tableId,
        thrownCard,
        groupCards,
      ]);
      return {
        thrownCard,
        isRummy: userInfo.data['rummy_complete'],
        groupCards,
      };
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR_throw`, [e, tableId]);
      throw e;
    }
  }

  static async getLobby(lobbyId: number) {
    try {
      Logger.info(`getLobby request `, [lobbyId]);
      const lobbyInfo = await axios.get(
        `${this.host}${this.GET_LOBBY}/${lobbyId}`,
        {
          headers: {
            Authorization: defaultToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      Logger.info(`getLobby response `, [lobbyInfo.data.data]);
      return lobbyInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e, lobbyId]);
      throw e;
    }
  }

  static async getActiveMatch(authToken: string) {
    try {
      const lobbyInfo = await axios.get(
        `${this.host}${this.GET_ACTIVE_MATCH}`,
        {
          headers: {
            Authorization: authToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      return lobbyInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
      throw e;
    }
  }
  static async getUserWallet(authToken: string) {
    try {
      Logger.info(`getUserWallet request `, [authToken]);
      const userInfo = await axios.get(
        `${this.host}${this.WALLET_BALANCE}`,
        {
          headers: {
            Authorization: authToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      Logger.info(`getUserWallet response `, [authToken]);
      return userInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
      throw e;
    }
  }

  static async getUserProfile(userId: number) {
    try {
      Logger.info(`getUserProfile request `, [userId]);
      const userInfo = await axios.get(
        `${this.host}${this.GET_USER_PROFILE.replace(
          '?',
          String(userId),
        )}`,
        {
          headers: {
            Authorization: defaultToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      Logger.info(`getUserProfile response `, [userInfo.data.data]);
      return userInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e, userId]);
      throw e;
    }
  }
  static async userAuth(authToken: string) {
    try {
      Logger.info(`userAuth request `, [authToken]);
      const userInfo = await axios.get(
        `${this.host}${this.USER_AUTH}`,
        {
          headers: {
            Authorization: authToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      Logger.info(`userAuth response `, [userInfo.data.data]);
      return userInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
      throw e;
    }
  }

  static async getAvailableBot(lobbyAmount) {
    try {
      const userInfo = await axios.get(
        `${this.host}${this.AVAILABLE_BOT}`,
        {
          headers: {
            Authorization: defaultToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      return { ...userInfo.data.data, isPrime: false };
    } catch (e) {
      return false;
    }
  }

  static async generateBot() {
    try {
      const userInfo = await axios.get(
        `${this.host}${this.ADD_BOT}/1`,
        {
          headers: {
            Authorization: defaultToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      return userInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e]);
      throw e;
    }
  }

  static async updateProfile(
    userId: number,
    options: any, //level,isPlaying,profilePic
  ) {
    try {
      const userInfo = await axios.post(
        `${this.host}${this.UPDATE_PROFILE.replace('?', String(userId))}`,
        options,
        {
          headers: {
            Authorization: defaultToken,
            'User-Agent': 'BestHTTP/2 v2.8.5',
          },
        },
      );
      return userInfo.data.data;
    } catch (e) {
      Logger.error(`INTERNAL_SERVER_ERROR`, [e, userId]);
      throw e;
    }
  }

  static async createBattle(
    userIds: number[],
    lobbyId: number,
    matchId: string,
  ) {
    try {
      const IdempotencyKey = Date.now().toString();
      const url = `${this.host}${this.CREATE_BATTLE}`;
      const userInfo = await this.retryRequest(
        () =>
          axios.post(
            url,
            {
              usersId: userIds,
              lobbyId,
              matchId,
            },
            {
              headers: {
                Authorization: defaultToken,
                'User-Agent': 'BestHTTP/2 v2.8.5',
                'Idempotency-Key': IdempotencyKey,
              },
            },
          ),
        url,
      );
      return userInfo.data.data;
    } catch (e) {
      Logger.error('INTERNAL_SERVER_ERROR createBattle_error', [
        e,
        matchId,
      ]);
      throw e;
    }
  }

  static async cancelBattle(matchId: string) {
    try {
      const IdempotencyKey = Date.now().toString();
      const url = `${this.host}${this.CANCEL_MATCH}`;
      const userInfo = await this.retryRequest(
        () =>
          axios.post(
            `${this.host}${this.CANCEL_MATCH}`,
            {
              matchId,
            },
            {
              headers: {
                Authorization: defaultToken,
                'User-Agent': 'BestHTTP/2 v2.8.5',
                'Idempotency-Key': IdempotencyKey,
              },
            },
          ),
        url,
      );
      return userInfo.data.data;
    } catch (e) {
      Logger.error('INTERNAL_SERVER_ERROR createBattle_error', [
        e,
        matchId,
      ]);
      throw e;
    }
  }

  static async finishBattle(
    matchId: string,
    roundId: string,
    historyS3Id: string,
    winnersId: number[],
    usersInfo: Array<usersInfo>,
    isFinalRound: boolean,
  ) {
    try {
      const IdempotencyKey = Date.now().toString();
      const payload = {
        matchId: matchId,
        roundId: roundId,
        historyS3Id: historyS3Id,
        winnersId: winnersId,
        usersInfo: usersInfo,
        isFinalRound: isFinalRound,
      };
      Logger.info(`finishBattle request `, [payload]);
      const url = `${this.host}${this.FINISH_BATTLE}`;
      const userInfo = await this.retryRequest(
        () =>
          axios.post(url, payload, {
            headers: {
              Authorization: defaultToken,
              'User-Agent': 'BestHTTP/2 v2.8.5',
              'Idempotency-Key': IdempotencyKey,
            },
          }),
        url,
      );
      Logger.info(`finishBattle response ${matchId}`, [
        userInfo.data,
      ]);
      return userInfo.data;
    } catch (e: any) {
      Logger.error('INTERNAL_SERVER_ERROR finishBattle_error', [
        e,
        matchId,
      ]);
      throw new CancelBattleError(e.messsage, e);
    }
  }
}

interface usersInfo {
  id: number;
  points: number;
}

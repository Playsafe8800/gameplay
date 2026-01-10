import { Logger } from '../../newLogger';
import { zk } from '../../connections';
import {
  DOUBLE_DECK,
  EVENTS,
  NUMERICAL,
  PLAYER_STATE,
  SINGLE_DECK,
  TABLE_STATE,
  CURRENCY_TYPE, SINGLE_DECK_COMBINATIONS, DOUBLE_DECK_COMBINATIONS,
} from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { roundScoreCardService } from '../../db/roundScoreCard';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import { userProfileService } from '../../db/userProfile';
import {
  CurrentRoundTurnHistorySchema,
  InitialTurnSetup,
  PlayerGameplay,
  SeatSchema,
  TurnDetailsSchema,
  UserProfile,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { dateUtils } from '../../utils/date';
import { sortedCards } from '../../utils/turnHistory';
import { scheduler } from '../schedulerQueue';
import { tableOperation } from '../signUp/tableOperation';
import { cardHandler } from './cardHandler';
import { eventStateManager } from '../../state/events';
import { STATE_EVENTS } from '../../constants/events';
import {
  getDropPoints,
  isPointsRummyFormat,
} from '../../utils/index';
import { redlock } from '../../utils/lock/redlock';
import { Lock } from 'redlock';
const { MAX_TIMEOUT } = zk.getConfig();
import { RemoteConfig } from '../../constants/remoteConfig';
import { seatShuffle } from './seatShuffle'

class Round {
  async startRound(tableId: string) {
    let lock!: Lock;
    try {
      Logger.info(`startRound: ${tableId}`);
      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            'maximumPoints',
            'gameType',
            'bootValue',
            'currentRound',
            'isNewGameTableUI',
            "isMultiBotEnabled"
          ],
        );
      if (!tableConfigData)
        throw new Error(
          `Table configuration not set for tableId ${tableId}`,
        );
      const tableGameData =
        await tableGameplayService.getTableGameplay(
          tableId,
          tableConfigData.currentRound,
          ['dealerPlayer', 'potValue', 'seats', 'tableState'],
        );

      if (!tableGameData)
        throw new Error(
          `Table gameplay data not set for tableId ${tableId}`,
        );

      tableGameData.seats = tableGameData.seats.filter((e) => e._id);
      if (
        tableGameData.tableState === TABLE_STATE.WINNER_DECLARED ||
        tableGameData.tableState === TABLE_STATE.PLAY_MORE
      ) {
        const errMsg = 'winner has already been declared';
        Logger.error(`INTERNAL_SERVER_ERROR`, [
          errMsg,
          tableId,
          tableGameData,
        ]);
        throw new Error(errMsg);
      }

      // seat shuffle If multiple player are here
      if (tableConfigData.isMultiBotEnabled) {
        let currentPlayersInTable = tableGameData.seats
          .filter((seat: any) => seat._id)
          .sort((a: any, b: any) => a.seat - b.seat);

        const seatIndexsToChange: any = [];
        const botIndexs: any = [];
        const alreadyPushed: any = [];
        for (let i = 0; i < currentPlayersInTable.length; i++) {
          const firstEle = currentPlayersInTable[i]
          const secondEle = currentPlayersInTable[i + 1]
            ? currentPlayersInTable[i + 1]
            : currentPlayersInTable[0]

          if (!firstEle.isBot && !secondEle.isBot) {
            if (!alreadyPushed.includes(firstEle._id))
              seatIndexsToChange.push({
                _id: firstEle._id,
                seat: firstEle.seat,
              });
            if (!alreadyPushed.includes(secondEle._id))
              seatIndexsToChange.push({
                _id: secondEle._id,
                seat: secondEle.seat,
              });
            alreadyPushed.push(firstEle._id, secondEle._id);
          }
          if (firstEle.isBot)
            botIndexs.push({
              _id: firstEle._id,
              seat: firstEle.seat,
            });
        }
        let newTgpSeats: any = [];
        if (seatIndexsToChange.length) {
          const newSeats: any[] = [];
          let realIdx = 0,
            botIdx = 0;

          while (
            realIdx < seatIndexsToChange.length ||
            botIdx < botIndexs.length
          ) {
            if (realIdx < seatIndexsToChange.length) {
              newSeats.push({
                ...seatIndexsToChange[realIdx],
                seat: newSeats.length,
              });
              realIdx++;
            }
            if (botIdx < botIndexs.length) {
              newSeats.push({
                ...botIndexs[botIdx],
                seat: newSeats.length,
              });
              botIdx++;
            }
          }

          const usedIds = new Set([
            ...seatIndexsToChange.map((s) => s._id),
            ...botIndexs.map((b) => b._id),
          ]);
          currentPlayersInTable.forEach((seat) => {
            if (!usedIds.has(seat._id)) {
              newSeats.push({ ...seat, seat: newSeats.length });
            }
          });
          newTgpSeats = newSeats.map((e) => {
            delete e.isBot;
            return e;
          });
          tableGameData.seats = newTgpSeats
          Logger.info(`new seats after shuffle `, [
            seatIndexsToChange,
            botIndexs,
            newTgpSeats,
            currentPlayersInTable,
          ]);
          await seatShuffle(
            tableId,
            tableConfigData.currentRound,
            { seats: newSeats },
            [],
            false,
            {
              playerInfo: newTgpSeats.map((e) => {
                return { userId: e._id };
              }),
            },
          );
        }
      }

      const prevTableGameData =
        await tableGameplayService.getTableGameplay(
          tableId,
          tableConfigData.currentRound - 1,
          ['dealerPlayer'],
        );

      let prevDealer: any = null;
      if (prevTableGameData && prevTableGameData.dealerPlayer) {
        prevDealer = prevTableGameData.dealerPlayer;
      }

      // let { seats } = tableGameData;
      const { potValue } = tableGameData;

      const { currentRound, gameType } = tableConfigData;
      const { playingSeats = [], allPlayerGamePlay = [] } =
        await this.getAllPlayersPGPandSeatsInfo(
          tableId,
          currentRound,
          tableConfigData.maximumPoints,
          tableGameData.seats,
        );

      /**
       * if only 1 playing player is left in the table
       * this case will occur when every got eliminated in previous round expect one
       * and no eliminated player did rejoin/rebuy
       */
      if (playingSeats.length === 1) {
        // finish the round here
      }
      let { dealerId } = this.chooseDealer(playingSeats, prevDealer);

      /**
       * toss cards to choose dealer for first round only
       * and every round for points rummy
       */
      if (
        tableConfigData?.isNewGameTableUI &&
        (isPointsRummyFormat(gameType) ||
          (!prevDealer && currentRound === 1))
      ) {
        const tossCardsWithUserIds =
          await cardHandler.chooseCardsForDealerToss(
            tableGameData.seats,
          );

        const [dealerPlayerData] = tossCardsWithUserIds.filter(
          (twu) => twu.tossWinner,
        );
        // get previous user to set as dealer
        const previousUser = this.getPreviousPlayer(
          dealerPlayerData?.userId,
          allPlayerGamePlay,
        );
        dealerId = previousUser;

        const chooseDealerPayload = {
          tableId,
          playerInfo: tossCardsWithUserIds.map((e) => {
            if (e.userId === dealerId) {
              e.tossWinner = true;
            } else {
              if (e.tossWinner) delete e.tossWinner;
            }
            return e;
          }),
        };
        await socketOperation.sendEventToRoom(
          tableId,
          EVENTS.CHOOSE_DEALER_SOCKET_EVENT,
          chooseDealerPayload,
        );

        await scheduler.addJob.cardTossToChooseDealer(tableId);
      }
      /**
       * toss cards to choose dealer
       */
      const playersData = await Promise.all(
        playingSeats.map((e) =>
          userProfileService.getOrCreateUserDetailsById(e._id),
        ),
      );

      const dealerObj = playersData.find(
        (user) => user.id === dealerId,
      );
      if (!dealerObj)
        throw new Error(`Dealer didn't get set ${tableId}`);

      tableGameData.dealerPlayer = dealerId;
      if (!isPointsRummyFormat(tableConfigData.gameType)) {
        tableGameData.potValue =
          tableConfigData.currentRound === 1
            ? tableConfigData.bootValue * tableGameData.seats.length
            : potValue;
      }
      await tableGameplayService.setTableGameplay(
        tableId,
        tableConfigData.currentRound,
        tableGameData,
      );

      // on 2nd round onwards, no need to wait for 2 sec and for oldUI also
      // don't send for points rummy
      if (
        !tableConfigData?.isNewGameTableUI ||
        (prevDealer && !isPointsRummyFormat(gameType))
      ) {
        this.startRoundToSendCards(tableId);
      }
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR startRound ${tableId}`, [
        error,
      ]);
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in startRound; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on leaveTable: `,
          err,
        );
      }
    }
    return true;
  }

  async startRoundToSendCards(tableId: string) {
    Logger.info(`startRoundToSendCards: ${tableId}`);
    try {
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            '_id',
            'currentRound',
            'maximumPoints',
            'maximumSeat',
            'gameType',
            'currencyType',
          ],
        );
      if (!tableConfigData)
        throw new Error(
          `startRoundToSendCards: Table configuration not set for tableId ${tableId}`,
        );
      const tableGameData =
        await tableGameplayService.getTableGameplay(
          tableId,
          tableConfigData.currentRound,
          ['trumpCard', 'seats', 'dealerPlayer'],
        );
      if (!tableGameData)
        throw new Error(
          `startRoundToSendCards: Table gameplay data not set for tableId ${tableId}`,
        );

      const { currentRound, maximumPoints } = tableConfigData;
      const { seats } = tableGameData;
      const { playingSeats = [], allPlayerGamePlay = [] } =
        await this.getAllPlayersPGPandSeatsInfo(
          tableId,
          currentRound,
          maximumPoints,
          seats,
        );

      const userObjectIds = seats.map((seat) => seat._id);

      const playersData = await Promise.all(
        playingSeats.map((e) =>
          userProfileService.getOrCreateUserDetailsById(e._id),
        ),
      );

      const { dealerPlayer: dealerId } = tableGameData;
      const dealerObj = playersData.find(
        (user) => user.id === dealerId,
      );
      const dealerIndex = playingSeats.find(
        (user) => user._id === dealerId,
      )?.seatIndex;

      if (!dealerObj || typeof dealerIndex === 'undefined')
        throw new Error(`Dealer didn't get set ${tableId}`);

      const nextTurn = this.getNextPlayer(
        dealerObj.id,
        allPlayerGamePlay,
      );

      const { usersCards, wildCard, firstOpenCard, shuffledDeck } =
        await this.distributeCards(
          tableConfigData,
          playersData,
          tableConfigData.currencyType === CURRENCY_TYPE.COINS,
        );

      tableGameData.trumpCard = wildCard;
      tableGameData.closedDeck = shuffledDeck;
      tableGameData.opendDeck = firstOpenCard;
      tableGameData.tableState = TABLE_STATE.ROUND_STARTED;
      await tableGameplayService.setTableGameplay(
        tableId,
        tableConfigData.currentRound,
        tableGameData,
      );

      // open discarded card initialisation and modification
      const openDiscardedCardsData = {
        openCards: [
          {
            userId: 0,
            card: firstOpenCard[0],
          },
        ],
      };
      await tableGameplayService.setOpenDiscardedCards(
        tableId,
        currentRound,
        openDiscardedCardsData,
      );

      // RETURNS ARRAY containing playerGamePlay data
      // SAVING USER CARDS IN DB
      const [playerGamePlayData] = await Promise.all([
        playerGameplayService.updateCardsByRoundId(
          playingSeats,
          usersCards,
          tableId,
          currentRound,
          wildCard,
          tableConfigData.maximumPoints,
        ),
        tableGameplayService.setTableGameplay(
          tableId,
          tableConfigData.currentRound,
          tableGameData,
        ),
        eventStateManager.fireEvent(
          tableId,
          STATE_EVENTS.LOCK_IN_PERIOD_TIMER,
        ),
      ]);

      /**
       * this function moves the dealer to index 0 in array while keeping the order
       */
      const reorderedSeats = this.rearrangedSeats(
        userObjectIds,
        dealerIndex,
      );

      const playersDataArr = await Promise.all(
        seats.map((e) =>
          userProfileService.getUserDetailsById(e._id),
        ),
      );

      const eventData: any = {
        tableConfigData,
        tableGameData,
        usersCards,
        playersData: playersDataArr,
        playingSeats: seats,
        wildCard,
        firstOpenCard: firstOpenCard[0],
        nextTurn,
        seats: reorderedSeats,
        dealerId: dealerIndex,
      };
      const dealerAndTableCard = {
        tableId,
        dealer: dealerId,
        wildCard,
        firstOpenDeckCard: firstOpenCard[0],
        roundNumber: currentRound,
      };

      tableGameData.seats = seats;
      eventData.seats = eventData.seats.map((seat) => seat.seat);

      const userSocketIdMap: { [x: number]: string } = {};
      playersData.forEach((userProfile) => {
        userSocketIdMap[userProfile.id] = userProfile.socketId;
      });

      playerGamePlayData.forEach(async (updatedPGP, index) => {
        eventData.seatIndex = index;
        const {
          userId,
          currentCards,
          groupingCards = [],
        } = updatedPGP || {};
        const { score, meldLabel } = cardHandler.groupCardsOnMeld(
          groupingCards,
          tableGameData.trumpCard,
          tableConfigData.maximumPoints,
        );
        const formattedData = Object.assign(
          {
            cards: currentCards,
            group: groupingCards,
            meld: meldLabel,
            score,
          },
          dealerAndTableCard,
        );

        await socketOperation.sendEventToClient(
          userSocketIdMap[userId || 0],
          formattedData,
          EVENTS.SET_MY_CARDS,
        );
        // instrumentation call
        // userRummyRoundStarted(
        //   tableConfigData,
        //   tableGameData,
        //   userId || 0,
        // );
      });
      const initialTurnPayload: InitialTurnSetup = {
        tableId,
        roundNumber: currentRound,
        nextTurn,
        userIds: userObjectIds,
      };
      scheduler.addJob.initialTurnSetup(
        initialTurnPayload,
        NUMERICAL.TWO * NUMERICAL.THOUSAND,
      );
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR startRoundToSendCards ${tableId}`,
        [error],
      );
    }
  }

  async getAllPlayersPGPandSeatsInfo(
    tableId: string,
    currentRound: number,
    maximumPoints: number,
    seats: Array<SeatSchema>,
  ) {
    const playingSeats: Array<SeatSchema> = [];
    const playingGameData: Array<any> = [];
    const eliminatedUsers: Array<any> = [];
    let allPlayerGamePlay: Array<any> = [];

    //@ts-ignore
    allPlayerGamePlay = await Promise.all(
      seats.map((ele) =>
        playerGameplayService.getPlayerGameplay(
          ele._id,
          tableId,
          currentRound,
          ['userStatus', 'userId', 'dealPoint'],
        ),
      ),
    );
    allPlayerGamePlay = allPlayerGamePlay.filter((seat) => seat);
    seats = allPlayerGamePlay
      .filter(
        (player) => player && player.userStatus !== PLAYER_STATE.LEFT,
      )
      .map((player, i) => {
        if (player && player.userStatus !== PLAYER_STATE.LEFT) {
          const seatObj = {
            _id: player.userId,
            seatIndex: i,
            seat: i,
          };
          playingGameData.push(player);

          if (
            player.userStatus === PLAYER_STATE.PLAYING ||
            player.dealPoint < maximumPoints
          ) {
            playingSeats.push(seatObj);
          }
          if (player.dealPoint >= maximumPoints) {
            eliminatedUsers.push(player);
          }
          return seatObj;
        }
      }) as SeatSchema[];

    return {
      playingSeats,
      playingGameData,
      eliminatedUsers,
      allPlayerGamePlay,
    };
  }

  /**
   * @deprecated
   */
  splitToChunks(array: Array<number>, parts) {
    const result: Array<Array<number>> = [];
    for (let i = parts; i > 0; i--) {
      result.push(array.splice(0, Math.ceil(array.length / i)));
    }
    return result;
  }
  chooseDealer(seats: Array<SeatSchema>, prevDealer: number) {
    const prevDealerSeat = seats.find(
      (seat) => seat._id === prevDealer,
    );

    let nextDealer = Math.floor(Math.random() * seats.length);

    if (prevDealerSeat) {
      nextDealer = prevDealerSeat.seatIndex + 1;
    }

    const seat = seats[nextDealer % seats.length];

    return {
      dealerId: seat._id,
      dealerIndex: seat.seatIndex,
    };
  }

  getNextPlayer(
    currentTurn: number,
    allSeats: Array<PlayerGameplay>,
  ) {
    let arrIndex = allSeats.findIndex(
      (seat) => seat.userId === currentTurn,
    );
    arrIndex += 1;
    arrIndex %= allSeats.length;

    for (let i = 0; i < allSeats.length; ++i) {
      if (allSeats[arrIndex].userStatus !== PLAYER_STATE.PLAYING) {
        arrIndex += 1;
        arrIndex %= allSeats.length;
      }
    }
    return allSeats[arrIndex].userId;
  }

  getPreviousPlayer(currentTurn: number, allSeats: Array<any>) {
    let arrIndex = allSeats.findIndex(
      (seat: any) => seat.userId === currentTurn,
    );
    arrIndex = arrIndex !== 0 ? arrIndex - 1 : allSeats.length - 1;

    for (let i = allSeats.length; i > 0; --i) {
      if (allSeats[arrIndex].userStatus !== 'playing') {
        arrIndex -= 1;
      }
    }
    return allSeats[arrIndex].userId;
  }

  removeBotCards(cards, botCards) {
    const botCardsSet = new Set(botCards);
    return cards.filter((card) => !botCardsSet.has(card));
  }

  getRandomCardSequence(cards) {
    const suits = {};
    cards.forEach((card) => {
      const [suit, num] = card.split('-');
      const number = parseInt(num);
      if (!suits[suit]) suits[suit] = new Map();
      suits[suit].set(number, (suits[suit].get(number) || 0) + 1);
    });

    const allSequences: any = [];
    Object.keys(suits).forEach((suit) => {
      if (suit === 'J') return;
      const numberMap = suits[suit];
      const numbers = [...numberMap.keys()].sort((a, b) => a - b);

      for (let i = 0; i <= numbers.length - 3; i++) {
        let sequence: any = [];
        let valid = true;
        let length = 0;

        // Check sequences of length 3 or 4
        for (
          let len = 0;
          len < 4 && i + len < numbers.length;
          len++
        ) {
          const currentNum = numbers[i + len];
          const prevNum =
            len === 0 ? currentNum - 1 : numbers[i + len - 1];

          // Check if numbers are consecutive and available
          if (
            currentNum !== prevNum + 1 ||
            !numberMap.get(currentNum)
          ) {
            valid = false;
            break;
          }
          sequence.push(currentNum);
          length++;

          // Add sequence if length is 3 or 4
          if (length >= 3) {
            const cardSeq = sequence.map((num) => {
              const deckNum =
                numberMap.get(num) > 1 && Math.random() < 0.5 ? 1 : 0;
              return `${suit}-${num}-${deckNum}`;
            });
            allSequences.push(cardSeq);
          }
        }
      }
    });

    return allSequences.length > 0
      ? allSequences[Math.floor(Math.random() * allSequences.length)]
      : null;
  }

  async distributeCards(
    tableConfigData: any,
    playersData: Array<UserProfile>,
    isFree: boolean,
  ) {
    let CARDS_PER_PLAYER = 13;

    let cards =
      tableConfigData.maximumSeat === NUMERICAL.TWO
        ? [...SINGLE_DECK]
        : [...DOUBLE_DECK];

    let allSequences = tableConfigData.maximumSeat === NUMERICAL.TWO ? SINGLE_DECK_COMBINATIONS : DOUBLE_DECK_COMBINATIONS;

    const hasBot = playersData.some((player) => player.isBot);

    const realPlayer = hasBot
      ? playersData.find((player) => !player.isBot)
      : undefined;

    let realPlayerProfitLoss = 0;
    if (realPlayer) {
      for (const player of playersData) {
        const giveBotFavorThreshold = RemoteConfig.getNumber(
          'GIVE_BOT_FAVOR_THRESHOLD',
        ) || 0

        if (!player.isBot && player.profitLoss >= giveBotFavorThreshold)
          realPlayerProfitLoss = player.profitLoss;
      }
    }

    const usersCards: any = [];
    for (const player of playersData) {
      const playerCards: any[] = [];
      const isSetBotCardsEnable = RemoteConfig.getBoolean(
        'BOT_SET_CARD_ENABLE',
      );
      let giveSetCards = false
      if (isFree && !player.isBot) {
        giveSetCards = true
      } else if (
        isSetBotCardsEnable &&
        hasBot &&
        realPlayer &&
        player.isBot &&
        !isFree
      ) {
        if (realPlayerProfitLoss > 0) giveSetCards = true
      }

      if (giveSetCards){
        const setCards = allSequences[Math.floor(Math.random() * allSequences.length)]
        const setCardSet = new Set(setCards);
        allSequences = allSequences.filter(seq =>
          seq.every(card => !setCardSet.has(card))
        );
        const alreadySetCards = setCards.flat();
        cards = this.removeBotCards(cards, alreadySetCards);
        playerCards.push(...alreadySetCards);
      }

      Logger.info(`distributedInitialCards`, [
        playerCards,
        player.id,
        tableConfigData._id,
      ]);
      usersCards.push(playerCards);
    }

    for (let i = 0; i < usersCards.length; i++) {
      let usersCard = usersCards[i]
      while (usersCard.length < CARDS_PER_PLAYER) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        usersCard.push(cards[randomIndex]);
        cards.splice(randomIndex, 1);
      }
      usersCards[i] = usersCard
    }

    // selecting wildCards
    // if joker comes in wildCard then card shifting takes place until we get card that is not joker
    let shuffledDeck = this.shuffleCards(cards);
    shuffledDeck = this.shuffleCards(shuffledDeck);
    while (shuffledDeck[0] && shuffledDeck[0].split('-')[0] === 'J') {
      shuffledDeck.push(shuffledDeck[0]);
      shuffledDeck.splice(0, 1);
    }

    const [wildCard] = shuffledDeck.splice(0, 1);
    // selecting first face up card
    // const firstOpenCard = ['J-1-0'];
    const firstOpenCard = shuffledDeck.splice(0, 1); // ['J-1-0'];
    return {
      usersCards,
      wildCard,
      firstOpenCard,
      shuffledDeck,
    };
  }

  shuffleCards(cards: string[]) {
    const shuffle: Array<string> = [];
    while (cards.length > 0) {
      const randomNumber = Math.floor(Math.random() * cards.length);
      shuffle.push(cards[randomNumber]);
      cards.splice(randomNumber, 1);
    }
    return shuffle;
  }

  rearrangedSeats(seats: number[], dealerIndex: number) {
    const returnValue: Array<SeatSchema> = [];
    let loopTill = seats.length;

    for (let i = dealerIndex; i < loopTill; ++i) {
      returnValue.push({ _id: seats[i], seatIndex: i, seat: i });
    }

    loopTill = dealerIndex;

    for (let i = 0; i < loopTill; ++i) {
      returnValue.push({ _id: seats[i], seatIndex: i, seat: i });
    }

    return returnValue;
  }

  // this function will be called with await and a lock will been taken by it's parent function.
  async startUserTurn(
    tableId: string,
    currentRound: number,
    nextTurn: number,
    playerGamePlays: Array<any>,
  ) {
    try {
      Logger.info(
        `startUserTurn: ${tableId}:${currentRound}, nextTurn: ${nextTurn} PGP List: `,
        [playerGamePlays],
      );

      const currentTime = new Date();
      if (playerGamePlays.length <= 1)
        throw new Error(
          'startUserTurn::>Error: "playingTableData not found!!!"',
        );

      const [playerGamePlay] = playerGamePlays.filter(
        (e) => e?.userId === nextTurn,
      );
      if (!playerGamePlay)
        throw new Error(`Player gameplay not found for ${tableId}`);

      let isShowTimeOutMsg = false;
      if (playerGamePlay.timeoutCount >= MAX_TIMEOUT)
        isShowTimeOutMsg = true;

      const [tableGameData, userProfile] = await Promise.all([
        tableGameplayService.getTableGameplay(tableId, currentRound, [
          '_id',
          'trumpCard',
          'turnCount',
          'seats',
          'opendDeck',
          'closedDeck',
          'currentTurn',
          'randomWinTurn',
          'botTurnCount',
        ]),
        userProfileService.getOrCreateUserDetailsById(
          playerGamePlay?.userId,
        ),
      ]);

      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          [
            'userTurnTimer',
            'currentRound',
            'userTurnTimer',
            'maximumPoints',
            'gameType',
            'maximumSeat',
            'currencyType',
            'bootValue',
          ],
        );
      if (!tableGameData || !userProfile || !tableConfigData)
        throw new Error(
          `Tablegame data ${tableGameData} or userprofile ${userProfile} doesn't exist for user turn start ${tableId}`,
        );

      let firstPick = !tableGameData.turnCount;

      tableGameData.currentTurn = playerGamePlay.userId;
      tableGameData.noOfPlayers = tableGameData.seats.length;
      tableGameData.tableCurrentTimer = new Date(
        currentTime.setSeconds(
          currentTime.getSeconds() +
            Number(tableConfigData.userTurnTimer),
        ),
      ).toISOString();

      // turn history initialisation and modification
      let currentRoundHistory: CurrentRoundTurnHistorySchema =
        await turnHistoryService.getTurnHistory(
          tableId,
          currentRound,
        );

      if (!currentRoundHistory) {
        currentRoundHistory =
          turnHistoryService.getDefaultCurrentRoundTurnHistoryData(
            tableConfigData,
            tableGameData,
          );
        // turnHistory.history.push(currentRoundHistory);
      }

      const historyObj: TurnDetailsSchema = {
        turnNo: currentRoundHistory.turnsDetails.length + 1,
        userId: userProfile.id,
        turnStatus: '',
        startState: playerGamePlay.currentCards.toString(),
        cardPicked: '',
        cardPickSource: '',
        cardDiscarded: '',
        endState: '',
        createdOn: new Date().toISOString(),
        points: 0,
        sortedStartState: sortedCards(
          playerGamePlay.groupingCards,
          playerGamePlay.meld || [],
        ),
        sortedEndState: sortedCards([], []),
        isBot: userProfile.isBot,
        wildCard: tableGameData.trumpCard,
        closedDeck: tableGameData.closedDeck,
        openedDeckTop:
          tableGameData.opendDeck[tableGameData.opendDeck.length - 1],
      };

      currentRoundHistory.turnsDetails.push(historyObj);

      if (currentRoundHistory.turnsDetails.length !== 1) {
        tableGameData.turnCount =
          currentRoundHistory.turnsDetails.length;
        firstPick = false;
      }

      await Promise.all([
        tableGameplayService.setTableGameplay(
          tableId,
          currentRound,
          tableGameData,
        ),
        turnHistoryService.setTurnHistory(
          tableId,
          currentRound,
          currentRoundHistory,
        ),
      ]);

      const endTime = dateUtils.addEpochTimeInSeconds(
        tableConfigData?.userTurnTimer,
      );
      const userTurnData = {
        tableId,
        userId: tableGameData.currentTurn,
        time: endTime,
        isShowTimeOutMsg,
        dropGame: getDropPoints(
          playerGamePlay ? playerGamePlay.isFirstTurn : false,
          tableConfigData.maximumPoints,
          tableConfigData.gameType,
          tableConfigData.maximumSeat,
        ),
      };
      const eventName = firstPick
        ? EVENTS.FIRST_USER_TURN_START
        : EVENTS.USER_TURN_START;
      await Promise.all([
        eventStateManager.fireEvent(
          tableId,
          STATE_EVENTS.TURN_STARTED,
        ),
        socketOperation.sendEventToRoom(
          tableId,
          eventName,
          userTurnData,
        ),
      ]);
      Logger.info(
        `USER_TURN_STARTED_SOCKET_EVENT: tableId: ${tableId}`,
        [userTurnData, tableConfigData, playerGamePlays, nextTurn],
      );
      // if (playerGamePlay.isAutoDrop) {
      //   const client = await socketOperation.getSocketFromSocketId(
      //     userProfile.socketId,
      //   );
      //   // if (client) {
      //   //   client.userId = userProfile.id;
      //   // }
      //   await dropGame(
      //     { tableId, dropAndSwitch: playerGamePlay.isAutoDropSwitch },
      //     client || { userId: userProfile.id },
      //     GAME_END_REASONS.DROP,
      //   );
      //   return;
      // } else {
      const allUserIds = await Promise.all(
        tableGameData.seats.map((seat) =>
          userProfileService.getUserDetailsById(seat._id),
        ),
      );

      const dropPointUsers = {};
      const userTurnPromise: Promise<void>[] = [];
      tableGameData.seats.forEach((seat) => {
        const currentPGP = playerGamePlays.find(
          (pgp) => pgp.userId === seat._id,
        );
        const currentUser = allUserIds.find(
          (user) => user?.id === seat._id,
        );
        if (currentPGP && currentUser) {
          const currentDropGame = getDropPoints(
            currentPGP.isFirstTurn,
            tableConfigData.maximumPoints,
            tableConfigData.gameType,
            tableConfigData.maximumSeat,
          );
          dropPointUsers[seat._id] = currentDropGame;
          const userTurnData = {
            tableId,
            userId: tableGameData.currentTurn,
            time: endTime,
            isShowTimeOutMsg,
            dropGame: currentDropGame,
            dropPointUsers,
          };
          userTurnPromise.push(
            socketOperation.sendEventToPlayingPlayersOnly(
              currentUser.socketId,
              userTurnData,
              eventName,
              currentPGP,
            ),
          );
        }
      });

      await Promise.all([
        userTurnPromise,
        await scheduler.addJob.playerTurnTimer(
          tableId,
          tableGameData.currentTurn,
          tableConfigData.userTurnTimer * NUMERICAL.THOUSAND,
        ),
      ]);
      // }
      if (userProfile.isBot) {
        const [opponentPlayerGamePlay] = playerGamePlays.filter(
          (e) => e?.userId !== nextTurn,
        );
        if (opponentPlayerGamePlay) {
          await this.startBotTurn(
            tableId,
            userProfile,
            tableGameData.botTurnCount,
          );
        } else {
          Logger.error(
            `INTERNAL_SERVER_ERROR opponentPlayerGamePlay not found ${tableId} ${nextTurn} ${tableGameData.currentTurn} `,
            [playerGamePlays],
          );
        }
        tableGameData.botTurnCount += 1;
        await tableGameplayService.setTableGameplay(
          tableId,
          tableConfigData.currentRound,
          tableGameData,
        );
      }
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR startUserTurn ${tableId}, next turn ${nextTurn}`,
        [error],
      );
    }
  }

  private async startBotTurn(
    tableId: string,
    userProfile: UserProfile,
    botTurnCount: number,
  ) {
    const ran = Math.floor(
      Math.random() * (NUMERICAL.SIX - NUMERICAL.TWO + 1) +
        NUMERICAL.TWO,
    );

    await scheduler.addJob.botTurn(
      tableId,
      userProfile.id,
      botTurnCount,
      Math.ceil(NUMERICAL.SIXTEEN / ran) * NUMERICAL.THOUSAND,
    );
  }

  async saveRoundScoreCardData(tableId: string, winnerData: any) {
    let lastScoreCardData =
      await roundScoreCardService.getRoundScoreCard(tableId);

    Logger.info(`saveRoundScoreCardData: tableId: ${tableId}`, [
      winnerData,
      lastScoreCardData,
    ]);

    const scores = winnerData.playerInfo.map((player: any) => {
      return {
        score: [player.points],
        totalScore: player.totalPoints,
        userId: player.userId,
        username: player.username,
      };
    });
    if (!lastScoreCardData) {
      lastScoreCardData = scores;
    } else {
      lastScoreCardData = lastScoreCardData.map(
        (score: {
          score: any[];
          userId: number;
          totalScore: number;
          username: string;
        }) => {
          const scoreObj = scores.find(
            (newScore: any) => newScore.userId === score.userId,
          );
          if (!scoreObj) {
            const newScore = score.score.pop();
            score.score.push(newScore);
            score.score.push(newScore);
          } else {
            score.score = [...score.score, ...scoreObj.score];
            score.totalScore = scoreObj.totalScore;
          }
          return score;
        },
      );
    }

    Logger.info(`saveRoundScoreCardData: lastScoreCardData: `, [
      lastScoreCardData,
    ]);

    return roundScoreCardService.setRoundScoreCard(
      tableId,
      lastScoreCardData,
    );
  }
  async setupInitialTurn(
    tableId: string,
    currentRound: number,
    nextTurn: number,
    players: Array<number>,
  ) {
    try {
      const pgpResponse = await Promise.all(
        players.map((userId) => {
          return playerGameplayService.getPlayerGameplay(
            userId,
            tableId,
            currentRound,
            [
              'userId',
              'isFirstTurn',
              'userStatus',
              'groupingCards',
              'timeoutCount',
              'currentCards',
              'meld',
            ],
          );
        }),
      );
      const pgpArray: any[] = [];
      pgpResponse.forEach((pgp) => {
        if (pgp) pgpArray.push(pgp);
      });
      await this.startUserTurn(
        tableId,
        currentRound,
        nextTurn,
        pgpArray,
      );
    } catch (error) {
      Logger.error(
        'INTERNAL_SERVER_ERROR error on setupInitialTurn',
        [error],
      );
    }
  }

  async createNewRound(
    tableData: any,
    tableGameData: any,
    secondaryTimer: number,
    usersInfo: Array<UserProfile | null>,
  ) {
    Logger.info(`createNewRound: `, [tableData, tableGameData]);
    const { _id: tableId, currentRound } = tableData;
    const { seats } = tableGameData;
    const currentTime = new Date();
    const updatedTableData =
      await tableConfigurationService.updateCurrentRound(
        tableId,
        currentRound,
      );
    tableData.currentRound = currentRound + 1;
    tableGameData.tableState = TABLE_STATE.ROUND_TIMER_STARTED;
    tableGameData.tableCurrentTimer = new Date(
      currentTime.setSeconds(
        currentTime.getSeconds() + Number(secondaryTimer),
      ),
    ).toISOString();
    await tableOperation.setupRound(
      tableId,
      tableData.currentRound,
      tableData,
      tableGameData,
    );

    let tableGamePlayData;
    let seatsClone: Array<any> = [...seats];
    seatsClone = seatsClone.filter(
      (seat: SeatSchema) => seat._id !== null,
    );

    // inserting players in table
    for (let i = 0; i < seatsClone.length; ++i) {
      let seat: any = null;
      if (tableData.shuffleEnabled) {
        // shuffling the user seats
        const randIndx = parseInt(
          `${Math.random() * seatsClone.length}`,
          10,
        );
        seat = seatsClone[randIndx];
        seatsClone[randIndx] = null;
        seatsClone = seatsClone.filter(Boolean);
        i -= 1;
      } else {
        seat = seatsClone[i];
      }

      const playerGamePlayData =
        await playerGameplayService.getPlayerGameplay(
          seat._id,
          tableId,
          currentRound,
          ['userId', 'userStatus', 'tableSessionId', 'dealPoint'],
        );

      if (!playerGamePlayData)
        throw new Error(`Player game play not found createNewRound`);

      if (playerGamePlayData.userStatus === PLAYER_STATE.LEFT)
        continue;

      const { userId } = playerGamePlayData;
      const userProfile =
        await userProfileService.getOrCreateUserDetailsById(
          userId,
          usersInfo.find((user) => userId === user?.id)?.socketId,
        );
      if (userProfile) {
        playerGamePlayData.userStatus = PLAYER_STATE.PLAYING;
        const { updatedTableGameplayData } =
          await tableOperation.insertPlayerInTable(
            userProfile,
            tableData,
            playerGamePlayData,
            undefined,
            playerGamePlayData?.tableSessionId,
          );
        tableGamePlayData = updatedTableGameplayData;
      }
    }
    return { tableGamePlayData, tableData: updatedTableData };
  }

  async createNewRoundPoints(tableData: any, tableGameData: any) {
    const { _id: tableId, currentRound } = tableData;
    const { seats, standupUsers } = tableGameData;

    Logger.info(
      `createNewRound ${tableId} >> currentRound: ${currentRound}`,
      [
        '\n >>  seats  >> \n',
        seats,
        '\n >> standupUsers  >> \n',
        standupUsers,
      ],
    );

    // remove standup user from seats
    const withoutStandupUserSeats = seats.map((e: any) => {
      const isUserStandup = standupUsers?.find(
        (sta: any) => sta._id === e._id,
      );
      if (isUserStandup) e._id = null;
      delete e.userId;
      delete e.sessionId;
      return e;
    });

    Logger.info(
      `createNewRoundPoints ${tableId} >> withoutStandupUserSeats: \n`,
      [withoutStandupUserSeats],
    );

    const tempSeats = Array(tableData.maximumSeat).fill({});
    for (let i = 0; i < tempSeats.length; i++) {
      tempSeats[i] = { _id: null, seat: i };
    }
    const newSeats: Array<any> = [];
    for (let i = 0; i < tempSeats.length; i++) {
      const sobj = tempSeats[i];
      const matchingUserSeat = withoutStandupUserSeats.find(
        (us) => String(us.seat) === String(sobj.seat),
      );
      if (matchingUserSeat) {
        newSeats.push(matchingUserSeat);
      }
    }

    for (const seat of newSeats) {
      if (!seat?._id) continue;
      const playerGamePlayData =
        await playerGameplayService.getPlayerGameplay(
          seat._id,
          tableId,
          currentRound,
          ['userStatus'],
        );
      if (playerGamePlayData) {
        // if user has state left then don't create new PGP
        const { userStatus } = playerGamePlayData;
        if (
          userStatus === PLAYER_STATE.LEFT ||
          userStatus === PLAYER_STATE.WATCHING
        ) {
          seat._id = null;
        }
      }
    }
    Logger.info(
      `createNewRoundPoints ${tableId} >> newSeats: >> \n`,
      [newSeats],
    );

    tableData.currentRound = currentRound + 1;
    await tableOperation.setupRound(
      tableId,
      tableData.currentRound,
      tableData,
      {
        seats: newSeats,
        standupUsers,
      },
    );

    let tableGamePlayData;
    let seatsClone: Array<any> = [...seats];

    // inserting players in table
    for (let i = 0; i < seatsClone.length; ++i) {
      let seat: any = null;
      if (tableData.shuffleEnabled) {
        // shuffling the user seats
        const randIndx = parseInt(
          `${Math.random() * seatsClone.length}`,
          10,
        );
        seat = seatsClone[randIndx];
        seatsClone[randIndx] = null;
        seatsClone = seatsClone.filter(Boolean);
        i -= 1;
      } else {
        seat = seatsClone[i];
      }

      const playerGamePlayData =
        await playerGameplayService.getPlayerGameplay(
          seat._id,
          tableId,
          currentRound,
          ['userId', 'userStatus', 'tableSessionId', 'dealPoint'],
        );

      if (playerGamePlayData) {
        // if user has state left/watching then no need to create new PGP
        const { userId, userStatus } = playerGamePlayData;
        if (
          userStatus !== PLAYER_STATE.LEFT &&
          userStatus !== PLAYER_STATE.WATCHING
        ) {
          const userProfile =
            await userProfileService.getOrCreateUserDetailsById(
              userId,
            );
          const { updatedTableGameplayData } =
            await tableOperation.insertPlayerInTable(
              userProfile,
              tableData,
              playerGamePlayData,
              undefined,
              playerGamePlayData?.tableSessionId,
            );
          tableGamePlayData = updatedTableGameplayData;
        }
      }
    }

    return { tableGamePlayData, tableData };
  }
}

export const round = new Round();

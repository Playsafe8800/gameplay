import { Logger } from '../../newLogger';
import { Lock } from 'redlock';
import {
  EVENTS,
  NUMERICAL,
  PLAYER_STATE,
  POINTS,
  TABLE_STATE,
  TOSS_CARDS,
} from '../../constants';
import { STATE_EVENTS, USER_EVENTS } from '../../constants/events';
import { TURN_HISTORY } from '../../constants';
import { playerGameplayService } from '../../db/playerGameplay';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { tableGameplayService } from '../../db/tableGameplay';
import { turnHistoryService } from '../../db/turnHistory';
import {
  cardSplitView,
  DeclareCardRequest,
  GroupCardsInterface,
  GroupCardsResponseInterface,
  MELD,
  Meld,
  MeldLabel,
  PlayerGameplay,
  SeatSchema,
  UserTossCardInterface,
} from '../../objectModels';
import { socketOperation } from '../../socketHandler/socketOperation';
import { eventStateManager } from '../../state/events';
import {
  issGroupingCardAndCurrentCardSame,
  removeEmptyString, removePickCardFromCards,
} from '../../utils';
import { cardUtils } from '../../utils/cards';
import { CancelBattleError } from '../../utils/errors/index';
import { redlock } from '../../utils/lock/redlock';
import { shuffleCards } from '../../utils/suffleCard';
import { sortedCards } from '../../utils/turnHistory';
import { declareCardEvent } from '../finishEvents/declareCard';
import { scheduler } from '../schedulerQueue/index';
import { cancelBattle } from './cancelBattle';
import { networkParams } from '../../objectModels/playerGameplay';
import { dateUtils } from '../../utils/date';
import { POOL_TYPES } from '../../constants/poolTypes';

class CardHandler {
  async groupCards(
    data: GroupCardsInterface,
    socket: any,
    networkParams: networkParams,
  ): Promise<GroupCardsResponseInterface> {
    let lock!: Lock;
    try {
      const { tableId } = data;
      const { userId } = socket;

      lock = await redlock.Lock.acquire(
        [`lock:${tableId}`],
        2000,
      );
      Logger.info(
        `Lock acquired, in groupCards resource:, ${lock.resource}`,
      );

      let isValid = true;
      let currentCardsGroup = data.group;

      currentCardsGroup = currentCardsGroup.filter(
        (cards) => cards.length > 0,
      );
      // Get table config for current round
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound',
          'maximumPoints']
        );
      const { currentRound } = tableConfigData;
      // Get PGP for current cards
      const [playerGameplayData, tableGameplayData] =
        await Promise.all([
          playerGameplayService.getPlayerGameplay(
            userId,
            tableId,
            currentRound,
            ["userStatus",
            "currentCards",
            "groupingCards"]
          ),
          tableGameplayService.getTableGameplay(
            tableId,
            currentRound,
            ['trumpCard']
          ),
        ]);

      if (!playerGameplayData || !tableGameplayData) {
        throw new Error(
          `TGP or PGP not found table: ${tableId}-${currentRound}, userId: ${userId} from groupCards`,
        );
      }

      if (
        !issGroupingCardAndCurrentCardSame(
          [...playerGameplayData.currentCards],
          currentCardsGroup,
        )
      ) {
        isValid = false;
        currentCardsGroup = playerGameplayData.groupingCards;
      }
      Logger.info(`currentCards: `, [
        playerGameplayData.currentCards,
        `${isValid} >> currentCardsGroup >> `,
        currentCardsGroup,
        tableId,
        playerGameplayData.userStatus,
      ]);

      const { score, meld, meldLabel } = this.groupCardsOnMeld(
        currentCardsGroup,
        tableGameplayData.trumpCard,
        tableConfigData.maximumPoints,
      );
      if (playerGameplayData.userStatus === PLAYER_STATE.FINISH) {
        return {
          tableId,
          isValid,
          score,
          meld: meldLabel,
          group: currentCardsGroup,
        };
      }
      // save score in PGP
      // playerGameplayData.points = score;
      playerGameplayData.meld = meld;
      playerGameplayData.groupingCards = currentCardsGroup;
      // playerGameplayData.points = score;
      if (networkParams) {
        playerGameplayData.networkParams = networkParams;
      }
      await playerGameplayService.setPlayerGameplay(
        userId,
        tableId,
        currentRound,
        playerGameplayData,
      );
      return {
        tableId,
        isValid,
        score,
        meld: meldLabel,
        group: currentCardsGroup,
      };
    } catch (error: any) {
      Logger.error(`INTERNAL_SERVER_ERROR groupCards ${error.message} `, [error,data]);
      throw error;
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in groupCards; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on groupCards: ${err}`,[err]
        );
      }
    }
  }

  labelTheMeld(input: {
    meld: Array<Meld>;
    cardsGroup: Array<Array<string>>;
  }) {
    const { cardsGroup, meld } = input;
    let firstLife = false;
    let secondLife = false;
    // {None, Pure, Impure, Set, Invalid, FirstLife, SecondLife, FirstLifeNeeded, SecondLifeNeeded}
    const result: MeldLabel[] = [];
    // consider all pure sequence
    meld.forEach((meldv, index) => {
      if (meldv === MELD.PURE) {
        if (!firstLife) {
          firstLife = true;
          result[index] = MeldLabel.FIRST_LF;
        } else if (!secondLife) {
          secondLife = true;
          result[index] = MeldLabel.SECOND_LF;
        } else {
          result[index] = MeldLabel.PURE_SEQ;
        }
      }
    });
    // consider all impure sequence, now possibly first life
    meld.forEach((meldv, index) => {
      if (meldv === MELD.SEQUENCE) {
        if (firstLife) {
          if (secondLife) {
            result[index] = MeldLabel.IMPURE_SEQ;
          } else {
            secondLife = true;
            result[index] = MeldLabel.SECOND_LF;
          }
        } else {
          result[index] = MeldLabel.FIRST_LF_NEEDED;
        }
      }
    });
    meld.forEach((meldv, index) => {
      if (meldv === MELD.SET) {
        if (firstLife && secondLife) {
          result[index] = MeldLabel.SET;
        } else if (firstLife) {
          result[index] = MeldLabel.SECOND_LF_NEEDED;
        } else {
          result[index] = MeldLabel.FIRST_LF_NEEDED;
        }
      } else if (meldv === MELD.DWD) {
        if (cardsGroup[index].length > 2) {
          result[index] = MeldLabel.INVALID;
        } else {
          result[index] = MeldLabel.NONE;
        }
      }
    });
    return result;
  }

  groupCardsOnMeld(
    cards: Array<Array<string>>,
    trumpCard: string,
    maximumPoints = POOL_TYPES.ONE_ZERO_ONE,
  ) {
    Logger.info(`groupCardsOnMeld imputs >> `, [cards, trumpCard]);
    let meld: Array<MELD> = [];
    let score = 0;
    let setValid = false;
    let pureSeqAvailable = false;
    const filteredCards = cards.filter((cards) => cards.length > 0);
    meld = filteredCards.map((currentGroup) => {
      if (currentGroup.length < 3) {
        return MELD.DWD;
      }
      const splitArray = this.splitCardsArray(currentGroup);
      if (this.checkForPureSequence(splitArray)) return MELD.PURE;
      if (this.checkForImpureSequence(splitArray, trumpCard))
        return MELD.SEQUENCE;
      if (this.checkForSets(splitArray, trumpCard)) return MELD.SET;
      else {
        return MELD.DWD;
      }
    });
    /**
     * check if there was a pure sequence;
     */
    pureSeqAvailable =
      meld.findIndex((groupName) => groupName === MELD.PURE) > -1;
    /**
     * set is Valid only
     *  - when there is a pure sequence
     *  - count of pure and impure sequence is greater then or equal to 2
     */
    setValid =
      pureSeqAvailable &&
      meld.reduce((count, groupName) => {
        count +=
          groupName === MELD.SEQUENCE || groupName === MELD.PURE
            ? 1
            : 0;
        return count;
      }, 0) >= 2;

    // Calculate score based on meld
    score = filteredCards.reduce((lastScore, cardsGroup, index) => {
      if (
        meld[index] === MELD.DWD ||
        (meld[index] === MELD.SET && !setValid) ||
        (meld[index] === MELD.SEQUENCE && !pureSeqAvailable)
      ) {
        lastScore += this.checkScore(cardsGroup, trumpCard);
      }
      return lastScore;
    }, 0);
    score =
      maximumPoints === POOL_TYPES.SIXTY_ONE &&
      score > POINTS.MAX_DEADWOOD_POINTS_61
        ? POINTS.MAX_DEADWOOD_POINTS_61
        : score > POINTS.MAX_DEADWOOD_POINTS
        ? POINTS.MAX_DEADWOOD_POINTS
        : score;
    const meldLabel = this.labelTheMeld({
      meld,
      cardsGroup: filteredCards,
    });
    this.sortGrouping(filteredCards, meldLabel, meld);
    cards.length = 0;
    cards.push(...filteredCards);
    return { meld, score, meldLabel };
  }

  checkScore(cards: Array<string>, trumpCard: string) {
    let score = 0;
    const trumpSplit = trumpCard.split('-');
    if (trumpSplit.length < 3)
      throw new Error(`Invalid trump card at checkScore`);
    const trumpCardNumber = Number(trumpSplit[1]);
    cards.forEach((card) => {
      score += this.checkCardScore(card, trumpCardNumber);
    });
    return score;
  }

  checkCardScore(card: string, trumpCard: number) {
    const splitCard = card.split('-');
    if (splitCard.length < 3)
      throw new Error(`Invalid card card at checkCardScore`);

    if (splitCard[0] === 'J' || trumpCard === Number(splitCard[1]))
      return 0; // Joker or wild card

    if (Number(splitCard[1]) > 10 || Number(splitCard[1]) === 1)
      return 10;

    return Number(splitCard[1]);
  }

  checkForSets(splitArray: Array<cardSplitView>, trumpCard: string) {
    const totalCount = splitArray.length;
    if (totalCount > 4 || totalCount < 3) {
      return false;
    }
    const trump = trumpCard.split('-');
    const trumpRank = Number(trump[1]);
    const cardsWithoutJoWiC = splitArray.filter(
      (card) => !(card.suit === 'J' || card.rank === trumpRank),
    );
    const suitList = cardsWithoutJoWiC.map((card) => card.suit);
    // should not have cards of same suit/ no duplicates in cards
    if (new Set(suitList).size === suitList.length) {
      let isvalid = true;
      // All non-JoWic cards should be of same rank
      for (let i = 0; i < cardsWithoutJoWiC.length - 1; i++) {
        if (
          cardsWithoutJoWiC[i].rank !== cardsWithoutJoWiC[i + 1].rank
        ) {
          isvalid = false;
          break;
        }
      }
      return isvalid;
    } else {
      return false;
    }
  }

  checkForPureSequence(split: Array<cardSplitView>) {
    const [{ suit: cardSuit }] = split;

    // check1: should belong to same suit.
    const sameFamily = split.every((v) => v.suit === cardSuit);
    if (!sameFamily) return false;
    // check2: now all cards belongs to same suit, should have no Joker.
    if (cardSuit === 'J') return false;

    return this.checkSequentialForPureSequence(
      split.map((card) => card.rank),
    );
  }

  checkForImpureSequence(
    splitArray: Array<cardSplitView>,
    trumpCard: string,
  ): boolean {
    const trumSplit = trumpCard.split('-');
    if (trumSplit.length < 3) throw new Error('Invalid trump card!');
    const trumpCardRank = Number(trumpCard.split('-')[1]);
    const cardList = splitArray.map((indC) => {
      return {
        rank: indC.rank,
        suit: indC.suit,
        wildorNot: indC.rank === trumpCardRank,
      };
    });

    let check = false;
    let check1 = false;
    let check2 = false;

    if (cardList.length <= 2) {
      return false;
    }
    const jokerList = cardList.filter(
      (a) => a.suit === 'J' || a.wildorNot,
    );

    const listCount = cardList.length;
    const jokerListCount = jokerList.length;
    const withouthJokerStringList: string[] = [];
    const withouthJokerNumberList: number[] = [];

    for (let j = 0; j < listCount; j++) {
      if (cardList[j].suit != 'J' && !cardList[j].wildorNot) {
        withouthJokerStringList.push(cardList[j].suit);
        withouthJokerNumberList.push(cardList[j].rank);
      }
    }

    withouthJokerNumberList.sort((a, b) => a - b);

    //  only joker in the Group
    if (withouthJokerNumberList.length > 0) {
      if (new Set(withouthJokerStringList).size === 1) {
        const [minimumNum] = withouthJokerNumberList;
        const tempJokerListCount = jokerListCount;
        // has Ace card
        if (minimumNum == 1) {
          // considering A=1
          check1 = this.checkSeqImpure(
            withouthJokerNumberList,
            tempJokerListCount,
            cardList.length,
          );
          // if A=1 didn't work make A=14
          if (!check1) {
            const tempJokerListCount1 = jokerListCount;

            let tempCardList: number[] = [];
            let AList: number[] = [];
            tempCardList = withouthJokerNumberList;

            AList = tempCardList.filter((a) => a === 1);
            tempCardList = tempCardList.filter((a) => a !== 1);

            for (let x = 0; x < AList.length; x++) {
              tempCardList.push(14); // Make Ace 14
            }
            check2 = this.checkSeqImpure(
              tempCardList,
              tempJokerListCount1,
              cardList.length,
            );
          }
          // A==1 or A==14 which ever worked consider that
          check = check1 || check2;
        } else {
          check = this.checkSeqImpure(
            withouthJokerNumberList,
            tempJokerListCount,
            cardList.length,
          );
        }
      }
    } else {
      const totalCard =
        withouthJokerNumberList.length + jokerListCount;
      check = totalCard === cardList.length;
    }
    return check;
  }

  // utility for Impure check
  private checkSeqImpure(
    ArrayWithNormalCards: number[],
    jokerCount: number,
    cardListCount: number,
  ): boolean {
    const sizeNormalCards = ArrayWithNormalCards.length;
    let check = false;
    if (sizeNormalCards > 1) {
      for (let i = 0; i < sizeNormalCards - 1; i++) {
        const diff = Math.abs(
          ArrayWithNormalCards[i] - ArrayWithNormalCards[i + 1],
        );
        // If difference is one means consecutive cards
        if (diff === 1) {
          check = true;
          continue;
        }
        /**
         * multiple cards of same rank or not
         * or
         * Joker or trump cards insufficient or  exhausted/finished
         */
        if (diff <= 0 || jokerCount < 1 || diff - 1 > jokerCount) {
          check = false;
          break;
        }
        jokerCount = jokerCount - (diff - 1);
        check = true;
      }
    } else {
      const totalCard = sizeNormalCards + jokerCount;
      check = totalCard === cardListCount;
    }
    return check;
  }

  splitCardsArray(cards: Array<string>): Array<cardSplitView> {
    const splitArray: Array<cardSplitView> = [];
    cards.forEach((currentCard) => {
      const currentSplit = currentCard.split('-');
      if (currentSplit.length < 3)
        throw new Error(`Invalid card sequence in splitCardArray`);
      splitArray.push({
        suit: currentSplit[0],
        deck: Number(currentSplit[2]),
        rank: Number(currentSplit[1]),
      });
    });
    return splitArray;
  }

  checkSequentialForPureSequence(nums: Array<number>) {
    let cards = [...nums];
    const groupSize = cards.length - 1;
    cards.sort((a, b) => a - b);
    const [firstCard] = cards;
    // let startTurn = NUMERICAL.ONE;
    let allSequenced = true;

    // card contains ace
    if (firstCard === NUMERICAL.ONE) {
      // either the second card should be two or last card should be king
      if (
        cards[1] !== NUMERICAL.TWO &&
        cards[groupSize] !== NUMERICAL.THIRTEEN
      ) {
        return false;
      } else if (cards[groupSize] === NUMERICAL.THIRTEEN) {
        // If king is present then make Ace 14th card.
        const [, ...restOfTheCrads] = cards;
        cards = [...restOfTheCrads, NUMERICAL.FOURTEEN];
      }
    }

    for (let i = 0; i < groupSize; i++) {
      if (Math.abs(cards[i + 1] - cards[i]) !== 1) {
        allSequenced = false;
        break;
      }
    }

    return allSequenced;
  }

  initialCardsGrouping(cards: Array<string>) {
    const Sp: string[] = [];
    const clb: string[] = [];
    const hrt: string[] = [];
    const dmd: string[] = [];
    const Jok: string[] = [];
    cards.forEach((card) => {
      const [firstChar] = card;
      switch (firstChar) {
        case 'S':
          Sp.push(card);
          break;
        case 'D':
          dmd.push(card);
          break;
        case 'C':
          clb.push(card);
          break;
        case 'H':
          hrt.push(card);
          break;
        default:
          Jok.push(card);
          break;
      }
    });
    return [hrt, dmd, clb, Sp, Jok]
      .filter((group) => {
        return group.length > 0;
      })
      .map((group) => {
        return group.sort((a, b) => {
          return Number(a.split('-')[1]) - Number(b.split('-')[1]);
        });
      });
  }

  private sortGrouping(
    group: string[][],
    meldLabel: MeldLabel[],
    meld: MELD[],
  ) {
    Logger.info('unsorted group', [group, meldLabel, meld]);
    const priority = {
      FirstLife: 1,
      SecondLife: 2,
      Pure: 3,
      Impure: 4,
      Set: 5,
      FirstLifeNeeded: 6,
      SecondLifeNeeded: 7,
      Invalid: 8,
      None: 9,
    };
    const newGroup: any[] = [];
    meldLabel.forEach((data, index) => {
      newGroup.push([group[index], data, meld[index]]);
    });
    newGroup.sort((gA, gB) => {
      return priority[gA[1]] - priority[gB[1]];
    });
    group.length = 0;
    meldLabel.length = 0;
    meld.length = 0;
    newGroup.forEach((element) => {
      const [grouping, label, meldValue] = element;
      group.push(grouping);
      meldLabel.push(label);
      meld.push(meldValue);
    });
    Logger.info('sorted group', [group, meldLabel, meld]);
  }

  async chooseCardsForDealerToss(seats: SeatSchema[]) {
    const cards: string[] = shuffleCards([...TOSS_CARDS]);

    const tossCards: string[] = [];
    const usersTossCardObj: Array<UserTossCardInterface> = [];

    for (const i in seats) {
      if (seats[i]?._id) {
        const tCard = cards[i];
        tossCards.push(tCard);
        usersTossCardObj.push({
          userId: seats[i]._id,
          seatIndex: seats[i].seat,
          tossCard: tCard,
        });
      }
    }

    const highCard = this.getHighCard(tossCards);

    usersTossCardObj.forEach((userTossCard) => {
      if (highCard === userTossCard.tossCard) {
        userTossCard.tossWinner = true;
      }
    });

    return usersTossCardObj;
  }

  private getHighCard(cards: string[]) {
    let highCard: string = cards[0]; // by default high card will be the first card
    let highCardSplitArr: any = highCard.split('-');

    for (let i = 1; i < cards.length; i++) {
      const tempCardSplitArr = cards[i].split('-');
      if (
        (parseInt(highCardSplitArr[1]) <
          parseInt(tempCardSplitArr[1]) &&
          parseInt(highCardSplitArr[1]) !== 1) ||
        parseInt(tempCardSplitArr[1]) === 1
      ) {
        //low rank
        highCardSplitArr = tempCardSplitArr;
      }
    }
    highCard = highCardSplitArr.join('-');
    return highCard;
  }

  async declareCard(
    data: DeclareCardRequest,
    socket: any,
    networkParams: networkParams,
  ): Promise<GroupCardsResponseInterface> {
    let lock!: Lock;
    try {
      const { tableId, card, group } = data;

      lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
      Logger.info(
        `Lock acquired, in declareCard resource:, ${lock.resource}`,
      );

      let currentCardsGroup = group;
      let isValid = true;
      const { userId } = socket;
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['_id',
          'userFinishTimer',
          'currentRound',
          'gameType',
          'maximumPoints']
        );
      const { currentRound } = tableConfigData;
      const [
        playerGameplayData,
        tableGameplayData,
        currentRoundHistory,
      ] = await Promise.all([
        playerGameplayService.getPlayerGameplay(
          userId,
          tableId,
          currentRound,
          ["userStatus",
          "currentCards",
          "groupingCards"]
        ),
        tableGameplayService.getTableGameplay(
          tableId,
          currentRound,
          ['declarePlayer',
          'seats',
          'closedDeck',
          'trumpCard',
          'opendDeck',
          'tableState',
          'declarePlayer',
          'currentTurn']
        ),
        turnHistoryService.getTurnHistory(tableId, currentRound),
      ]);

      if (!playerGameplayData || !tableGameplayData) {
        throw new Error(
          `TGP or PGP not found table: ${tableId}-${currentRound}, userId: ${userId} from declareCard`,
        );
      }

      if (
        !(
          tableGameplayData.currentTurn === userId &&
          playerGameplayData.currentCards.length === 14 &&
          playerGameplayData.userStatus === PLAYER_STATE.PLAYING
        )
      ) {
        Logger.error("INTERNAL_SERVER_ERROR Client doesn't have 14 cards", [
          tableId,
          tableGameplayData,
          playerGameplayData,
        ]);
        throw new Error(`INTERNAL_SERVER_ERROR Client doesn't have 14 cards`);
      }

      // // cancel player turn timer
      // await scheduler.cancelJob.playerTurnTimer(tableId, userId);
      // logic to pick and drop should come here
      // remove card from current deck
      if (playerGameplayData.currentCards.indexOf(card) === -1) {
        // no such card in the player's deck
        throw new Error(`Invalid card`);
      }
      playerGameplayData.currentCards = cardUtils.removeCardFromDeck(
        playerGameplayData.currentCards,
        card,
      );
      if (
        !issGroupingCardAndCurrentCardSame(
          [...playerGameplayData.currentCards],
          currentCardsGroup,
        )
      ) {
        isValid = false;
        currentCardsGroup = playerGameplayData.groupingCards;
      }
      currentCardsGroup = removePickCardFromCards(
        card,
        currentCardsGroup,
      );
      Logger.info(`currentCards: `, [
        playerGameplayData.currentCards,
        `${isValid} >> currentCardsGroup >> `,
        currentCardsGroup,
        tableId,
        playerGameplayData.userStatus,
      ]);
      const { score, meld, meldLabel } = this.groupCardsOnMeld(
        [...currentCardsGroup],
        tableGameplayData.trumpCard,
        tableConfigData.maximumPoints,
      );
      playerGameplayData.groupingCards = currentCardsGroup;
      playerGameplayData.meld = meld;
      // if (score != 0 && cardUtils.areSequencesValid(meld)) {
      //   // invalid declare
      //   return {
      //     tableId,
      //     score,
      //     meld: meldLabel,
      //     group: currentCardsGroup,
      //     isValid,
      //   };
      // }
      // cancel player turn timer
      await scheduler.cancelJob.playerTurnTimer(tableId, userId);
      playerGameplayData.userStatus = PLAYER_STATE.DECLARED;
      // Update TGP
      tableGameplayData.opendDeck.push(card);
      tableGameplayData.tableState = TABLE_STATE.DECLARED;
      tableGameplayData.declarePlayer = userId;

      // Round history save
      const currentRoundIndex =
        currentRoundHistory.turnsDetails.length - 1;
      currentRoundHistory.turnsDetails[currentRoundIndex].turnStatus =
        TURN_HISTORY.INVALID_DECLARE;
      currentRoundHistory.turnsDetails[
        currentRoundIndex
      ].cardDiscarded = card;
      currentRoundHistory.turnsDetails[currentRoundIndex].points =
        score;
      currentRoundHistory.turnsDetails[currentRoundIndex].endState =
        removeEmptyString(
          currentCardsGroup.toString().replace(/,*$/, ''),
        );
      currentRoundHistory.turnsDetails[
        currentRoundIndex
      ].sortedEndState = sortedCards(currentCardsGroup, meld);

      if (networkParams) {
        playerGameplayData.networkParams = networkParams;
      }
      await Promise.all([
        playerGameplayService.setPlayerGameplay(
          userId,
          tableId,
          currentRound,
          playerGameplayData,
        ),
        tableGameplayService.setTableGameplay(
          tableId,
          currentRound,
          tableGameplayData,
        ),
        turnHistoryService.setTurnHistory(
          tableId,
          currentRound,
          currentRoundHistory,
        ),
        eventStateManager.fireEvent(tableId, STATE_EVENTS.DECLARE),
      ]);
      // send event to room
      const declareData = {
        tableId,
        userId,
        card,
        message: ``,
      };
      await socketOperation.sendEventToRoom(
        tableId,
        EVENTS.DECLARE_CARD,
        declareData,
      );
      // const activePlayerSeatIndex = tableGameplayData.seats.map(
      //     (e) => e.userId,
      // );
      const pgps = await Promise.all(
        tableGameplayData.seats.map((seat) =>
          playerGameplayService.getPlayerGameplay(
            seat._id,
            tableId,
            currentRound,
            ["userStatus"]
          ),
        ),
      );
      const playersGameData: any[] = [];
      pgps.forEach(async (pgp: any | null) => {
        if (pgp) {
          playersGameData.push(pgp);
          await eventStateManager.fireEventUser(
            tableId,
            userId,
            USER_EVENTS.DECLARE,
            networkParams?.timeStamp ||
              dateUtils.getCurrentEpochTime(),
          );
        }
      });
      await declareCardEvent.scheduleFinishTimer(
        tableConfigData,
        tableGameplayData,
        playersGameData,
      );
      return {
        tableId,
        score,
        meld: meldLabel,
        group: playerGameplayData.groupingCards,
        isValid,
      };
    } catch (error: any) {
      Logger.error('INTERNAL_SERVER_ERROR cardHandlerDeclareCard ', [error]);
      if (error instanceof CancelBattleError) {
        await cancelBattle.cancelBattle(data.tableId, error);
      }
      throw error;
    } finally {
      try {
        if (lock && lock instanceof Lock) {
          await redlock.Lock.release(lock);
          Logger.info(
            `Lock releasing, in declareCard; resource:, ${lock.resource}`,
          );
        }
      } catch (err: any) {
        Logger.error(
          `INTERNAL_SERVER_ERROR Error While releasing lock on declareCard: ${err}`,[err]
        );
      }
    }
  }

  /**
   * To show all open discarded cards(open deck cards with userIds)
   */
  async discardedCards(tableId: string): Promise<any> {
    try {
      if (!tableId) {
        throw new Error(`data missing on discardedCards ${tableId}`);
      }
      const tableConfigData =
        await tableConfigurationService.getTableConfiguration(
          tableId,
          ['currentRound']
        );
      const { currentRound } = tableConfigData;

      const openDiscardedCardsData =
        await tableGameplayService.getOpenDiscardedCards(
          tableId,
          currentRound,
        );

      if (!openDiscardedCardsData?.openCards) {
        throw new Error(
          `discarded cards not found ${tableId}-${currentRound}`,
        );
      }
      const { openCards } = openDiscardedCardsData;
      const ackResponse = {
        tableId,
        openCards: openCards.reverse(),
      };
      return ackResponse;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error found on discadedCard ${tableId},
        error: ${error.message}`,
        [error],
      );
      return {
        message: 'This data is not available!',
      };
    }
  }
}

export const cardHandler = new CardHandler();

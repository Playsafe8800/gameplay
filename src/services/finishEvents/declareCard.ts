import { Logger } from '../../newLogger';
import { PLAYER_STATE } from '../../constants/playerState';
import { scheduler } from '../schedulerQueue/index';
import _ from 'underscore';
import { NUMERICAL } from '../../constants/numerical';
import { tableGameplayService } from '../../db/tableGameplay/index';
import { socketOperation } from '../../socketHandler/socketOperation';
import { EVENTS } from '../../constants/events';
import { dateUtils } from '../../utils/date';
import { playerGameplayService } from '../../db/playerGameplay';
import { userProfileService } from '../../db/userProfile';
import ValidSequence from '../rebuy/getSequence';

class DeclareCard {
  async scheduleFinishTimer(
    tableData: any,
    tableGameData: any,
    playersGameData: any[],
    forOthers = false,
  ) {
    Logger.info(`scheduleFinishTimer: ${tableData._id}`, [
      tableData,
      tableGameData,
      playersGameData,
      forOthers,
    ]);
    const { _id: tableId, userFinishTimer, currentRound } = tableData;
    const { declarePlayer, seats } = tableGameData;

    const playingUsers = seats.filter(
      (seat, i) =>
        playersGameData[i] &&
        playersGameData[i].userStatus === PLAYER_STATE.PLAYING,
    );

    let usersObjectIds = playingUsers.map((seat) => seat._id);

    if (declarePlayer !== null) {
      usersObjectIds = forOthers
        ? _.without(usersObjectIds, declarePlayer)
        : [declarePlayer];
    }

    const newTableGamePlay = { ...tableGameData };
    const currentTime = new Date();
    newTableGamePlay.tableCurrentTimer = new Date(
      currentTime.setSeconds(
        currentTime.getSeconds() + Number(userFinishTimer),
      ),
    ).toISOString();
    const finishData = {
      tableId,
      userIds: usersObjectIds,
      timer: dateUtils.addEpochTimeInSeconds(userFinishTimer),
    };

    const userProfiles = await Promise.all(usersObjectIds.map((e) => userProfileService.getUserDetailsById(e)))
    userProfiles.forEach(async (userDetail) => {
      if (userDetail && (userDetail as any).isBot) {
        const ran = Math.floor(
          Math.random() * (NUMERICAL.SIX - NUMERICAL.TWO + 1) +
          NUMERICAL.TWO,
        );
        const findPgp = await playerGameplayService.getPlayerGameplay((userDetail as any).id, tableId, currentRound, ['groupingCards', 'userId'])
        if (findPgp) {
          await scheduler.addJob.botFinish(
            tableId,
            findPgp.userId,
            ran * NUMERICAL.THOUSAND,
            findPgp.groupingCards,
          );
        }
      }
    })


    await Promise.all([
      tableGameplayService.setTableGameplay(
        tableId,
        tableData.currentRound,
        newTableGamePlay,
      ),
      scheduler.addJob.finishTimer(
        tableId,
        currentRound,
        usersObjectIds,
        userFinishTimer * NUMERICAL.THOUSAND,
        forOthers,
      ),
      socketOperation.sendEventToRoom(
        tableId,
        EVENTS.FINISH_TIMER,
        finishData,
      ),
    ]);
  }
  getRandomCardFromDeck(deck: string[]): string {
    const randomIndex = Math.floor(Math.random() * deck.length);
    return deck[randomIndex];
  }

  groupCardOpponat(currentCard, trumpCard) {
    const validSequences = new ValidSequence(currentCard, trumpCard);
    const { pureSeq, impureSeq, closedDeck, oldClosedDeck } =
      validSequences.getPureImpureSeq();

    const removeCardsFromDeck = (sequence: string[][]) => {
      sequence.forEach((seq) => {
        seq.forEach((card) => {
          const index = oldClosedDeck.indexOf(card);
          if (index !== -1) {
            oldClosedDeck.splice(index, 1);
          }
        });
      });
    };

    let finalCards: string[][] = [];
    const deadWood: string[] = [];

    const fourCards: string[][] = [];
    const threeCards: string[][] = [];

    for (let i = 0; i < pureSeq.length; i++) {
      const singleGroup = pureSeq[i];
      singleGroup.length === 4
        ? fourCards.push(singleGroup)
        : threeCards.push(singleGroup);
    }

    let isFour = false;
    let isThree = false;
    let isImpure = false;
    if (fourCards.length >= 1) isFour = true;
    if (threeCards.length >= 3) isThree = true;
    if (impureSeq.length >= 1) isImpure = true;

    if (isFour && isThree && isImpure) {
      // eslint-disable-next-line prefer-destructuring
      const impureFirst = impureSeq[0];
      impureFirst.shift();
      impureFirst.push(this.getRandomCardFromDeck(closedDeck));
      finalCards.push(impureFirst);

      finalCards.push(fourCards[0]);

      if (threeCards.length >= 3) {
        finalCards.push(...[threeCards[0], threeCards[1]]);
      }
    } else if (!isFour && isThree && isImpure) {
      finalCards.push(
        ...[threeCards[0], threeCards[1], threeCards[2]],
      );
      finalCards.push(impureSeq[0]);
      deadWood.push(this.getRandomCardFromDeck(closedDeck));
    } else if (isFour && !isThree && isImpure) {
      finalCards.push(fourCards[0]);
      // eslint-disable-next-line prefer-destructuring
      const impureFirst = impureSeq[0];
      impureFirst.shift();
      impureFirst.push(this.getRandomCardFromDeck(closedDeck));
      finalCards.push(impureFirst);
      for (let i = 1; i < impureSeq.length; i++) {
        if (finalCards.length !== 4) {
          finalCards.push(impureSeq[i]);
          continue;
        }
        break;
      }
    } else if (isFour && isThree && !isImpure) {
      finalCards.push(
        ...[threeCards[0], threeCards[1], threeCards[2]],
      );
      // eslint-disable-next-line prefer-destructuring
      const changedFour = fourCards[0];
      changedFour.shift();
      deadWood.push(this.getRandomCardFromDeck(closedDeck));
      finalCards.push(changedFour);
    } else if (!isFour && !isThree && isImpure) {
      for (let i = 0; i < impureSeq.length; i++) {
        if (finalCards.length !== 4) {
          finalCards.push(impureSeq[i]);
          continue;
        }
        break;
      }
      if (finalCards.length !== 4 && threeCards.length) {
        for (let i = 0; i < threeCards.length; i++) {
          if (finalCards.length !== 4) {
            finalCards.push(threeCards[i]);
            continue;
          }
          break;
        }
      }
      deadWood.push(this.getRandomCardFromDeck(closedDeck));
    } else if (isFour && !isThree && !isImpure) {
      Logger.error('INTERNAL_SERVER_ERROR Not possible ....', [currentCard, trumpCard]);
    } else if (!isFour && isThree && !isImpure) {
      finalCards.push(
        ...[threeCards[0], threeCards[1], threeCards[2]],
      );
      deadWood.push(this.getRandomCardFromDeck(closedDeck));
      if (threeCards.length >= 4) {
        finalCards.push(threeCards[3]);
      } else {
        Logger.error('INTERNAL_SERVER_ERROR Not possible ....', [currentCard, trumpCard]);
      }
    }

    if (deadWood.length) finalCards.push(deadWood);
    const currentCards = finalCards.flat().filter((e) => e);
    if (currentCards.length !== 13) {
      removeCardsFromDeck([currentCards]);
      const filteredCards: string[][] = [];
      for (let i = 0; i < finalCards.length; i++) {
        const element = finalCards[i];
        const singleGroup: string[] = [];
        for (let j = 0; j < element.length; j++) {
          if (element[j]) {
            singleGroup.push(element[j]);
          } else {
            singleGroup.push(
              this.getRandomCardFromDeck(oldClosedDeck),
            );
          }
        }
        filteredCards.push(singleGroup);
      }
      finalCards = filteredCards;
    }
    return finalCards;
  }
}
export const declareCardEvent = new DeclareCard();

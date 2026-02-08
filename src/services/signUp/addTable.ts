import { Logger } from '../../newLogger';
import { NUMERICAL } from '../../constants/numerical';
import { tableConfigurationService } from '../../db/tableConfiguration';
import { networkParams } from '../../objectModels/playerGameplay';
import { SignUpInterface } from '../../objectModels/requestHandling';
import { userService } from '../userService';
import UserServiceExt from '../../userService';
import { tableOperation } from './tableOperation';
import { scheduler } from '../schedulerQueue';
import { getBot } from '../../utils';
import { userProfileService } from '../../db/userProfile';
import { setValueInKeyWithExpiry } from '../../db/redisWrapper';
import { tableGameplayService } from '../../db/tableGameplay';
import { BOT_CONFIG, TABLE_STATE } from '../../constants';
import { redlock } from '../../utils/lock/redlock';
import { Lock } from 'redlock';
import { eventStateManager } from '../../state/events';
import userServiceExt from '../../userService';
import * as console from 'node:console';

export async function addTable(
  signUpData: SignUpInterface,
  socket: any,
  networkParams?: networkParams,
) {
  try {
    const { lobbyId, unitySessionId, tableSessionId } = signUpData;

    if (!lobbyId) throw new Error('lobbyId required for addTable');

    Logger.info(
      `Add table started for lobby Id ${lobbyId}, socketId: ${socket.id}, user: ${socket.userId}`,
    );
    const { userId } = socket;

    // Get lobby config
    const lobbyInfo: any = await UserServiceExt.getLobby(lobbyId);
    const {
      EntryFee,
      MaxPoints,
      RummyTips,
      ShowEmoji,
      GameFormat,
      MaxPlayers,
      MinPlayers,
      HideProfile,
      ManualSplit,
      RoundShuffle,
      SocketTimeout,
      UserTurnTimer,
      GameStartTimer,
      MaxPingCounter,
      ShowLeaderboard,
      UserFinishTimer,
      Max_player_count,
      Min_player_count,
      NetworkIndicator,
      PileDiscardCheck,
      FestivalUIEnabled,
      RequestRetryCount,
      RequestRetryDelay,
      SocketErrorTimeout,
      GameId,
      MaxBonusPercentage,
      isNewUI,
      LobbyId,
      CurrencyId,
      isMultiBotEnabled,
    } = lobbyInfo;

    const lobbyGameConfig = {
      MP: 2,
      SP: '',
      ESP: 2,
      Host: '',
      Rake: 10,
      BaseURL: '',
      EntryFee,
      MaxPoints: MaxPoints,
      RummyTips,
      ShowEmoji,
      GameFormat,
      MaxPlayers,
      MinPlayers,
      HideProfile,
      ManualSplit,
      RoundShuffle,
      SocketTimeout,
      UserTurnTimer,
      GameStartTimer,
      MaxPingCounter,
      ShowLeaderboard,
      UserFinishTimer,
      Max_player_count,
      Min_player_count,
      NetworkIndicator,
      PileDiscardCheck,
      FestivalUIEnabled,
      RequestRetryCount,
      RequestRetryDelay,
      SocketErrorTimeout,
      GameId,
      LobbyId,
      MaxBonusPercentage,
      isNewUI,
      globalMatchMaking: false,
      mmAlgo: '',
      cgsClusterName: '',
      CurrencyFactor: EntryFee,
      CurrencyId,
      isMultiBotEnabled,
    };
    const tableConfigurationData =
      tableConfigurationService.getDefaultTableConfigRedisObject(
        lobbyGameConfig,
      );

    // Create or find user
    const userData = await userService.findOrCreateUser(
      userId,
      socket.id,
      socket.handshake?.headers,
      socket.data.AppType,
      unitySessionId,
    );

    const gtiData = await tableOperation.addInTable(
      socket,
      tableConfigurationData,
      userData,
      NUMERICAL.ONE,
      networkParams,
      tableSessionId,
    );
    Logger.info('ADD TABLE', [gtiData]);

    const profile = await userServiceExt.getUserProfile(userId);
    userData.profitLoss = profile.profitLosss || 0;
    await userProfileService.setUserDetails(userId, userData);

    const getBotProfitThreshold = BOT_CONFIG.GET_BOT_PROFIT_THRESHOLD

    const bannedUsersForBot = BOT_CONFIG.BANNED_USERS_FROM_BOTS.split(',');

    if (
      tableConfigurationData.isMultiBotEnabled &&
      tableConfigurationData.maximumSeat == 6 &&
      gtiData?.isNewTable &&
      userData.profitLoss < getBotProfitThreshold &&
      !bannedUsersForBot.includes(userId.toString())
    ) {
      const botRange =
        BOT_CONFIG.MULTI_BOT_RANGE.split(',');
      let totalBot =
        Number(botRange[Math.floor(Math.random() * botRange.length)])

      const DELAY_MULTIPLIER = BOT_CONFIG.DELAY_MULTIPLIER

      let waitTime = 1
      for (let i = 1; i <= totalBot; i++) {
        waitTime += Math.round(i * DELAY_MULTIPLIER)
        await scheduler.addJob.bot(
          gtiData.tableId,
          gtiData.currentRound,
          waitTime* NUMERICAL.THOUSAND,
        );
      }
    } else {
      if (
        gtiData.playerInfo.length === 1 &&
        userData.profitLoss < getBotProfitThreshold &&
        !bannedUsersForBot.includes(userId.toString())
      ) {
        await scheduler.addJob.bot(
          gtiData.tableId,
          gtiData.currentRound,
          BOT_CONFIG.BOT_WAITING_TIME_IN_MS,
        );
      }
    }
    return {
      signupResponse: {
        userId: userData.id,
        username: userData.userName,
        profilePicture: userData.avatarUrl,
        tenant: userData.tenant,
      },
      gameTableInfoData: [gtiData],
      tableId: gtiData.tableId,
    };
  } catch (error: any) {
    // TODO: Handle IFE error here
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at add table handler`,
      [error],
    );
    throw error;
  }
}

export async function sitBotOnTable(tableId: string) {
  let lock!: Lock;
  try {
    lock = await redlock.Lock.acquire([`lock:${tableId}`], 2000);
    Logger.info(`start game with bot for table ${tableId}`);
    const tableConfigData =
      await tableConfigurationService.getTableConfiguration(tableId, [
        '_id',
        'currentRound',
        'maximumSeat',
        'maximumPoints',
        'gameType',
        'dealsCount',
        'currencyType',
        'lobbyId',
        'minimumSeat',
        'gameStartTimer',
        'bootValue',
        'isMultiBotEnabled',
      ]);

    if (!tableConfigData) {
      throw new Error(`Table data is not set correctly ${tableId}`);
    }

    const tableGameData = await tableGameplayService.getTableGameplay(
      tableId,
      1,
      ['tableState', 'noOfPlayers'],
    );
    if (!tableGameData)
      throw new Error(`TableGamePlay not found, ${tableId}`);
    console.log(!tableConfigData.isMultiBotEnabled &&
      (tableGameData.tableState !== TABLE_STATE.WAITING_FOR_PLAYERS ||
        tableGameData.noOfPlayers !== NUMERICAL.ONE), "=---first==-")
    console.log(tableGameData.tableState, "----", tableGameData.noOfPlayers, tableConfigData.isMultiBotEnabled)
    if (
      !tableConfigData.isMultiBotEnabled &&
      (tableGameData.tableState !== TABLE_STATE.WAITING_FOR_PLAYERS ||
        tableGameData.noOfPlayers !== NUMERICAL.ONE)
    )
      return;

    if (
      tableConfigData.isMultiBotEnabled &&
      ((tableGameData.tableState !==
        TABLE_STATE.ROUND_TIMER_STARTED &&
        tableGameData.tableState !==
          TABLE_STATE.WAITING_FOR_PLAYERS) ||
        tableGameData.noOfPlayers === 0 ||
        tableGameData.noOfPlayers === tableConfigData.maximumSeat)
    )
      return;

    const dummyPlayer = await getBot(tableConfigData.bootValue);
    const userProfile =
      await userProfileService.getOrCreateUserDetailsById(
        dummyPlayer.id,
        'jkdfuhakj',
        {},
        '',
        'rummyType',
      );
    const currentState =
      await eventStateManager.getCurrentState(tableId);
    if (currentState === 'none') {
      await eventStateManager.createState(tableId);
    }
    userProfile.isBot = true;
    await tableOperation.insertNewPlayer(
      undefined,
      userProfile,
      tableConfigData,
      true,
    );
    const userKey = userProfileService.generateUserDetailsKey(
      Number(dummyPlayer.id),
    );
    userProfile.level = dummyPlayer.level;
    userProfile.userName = makeid(8);
    await setValueInKeyWithExpiry(userKey, userProfile);
    Logger.info(
      `${dummyPlayer.id} bot user sitted on table ${tableId}`,
    );
  } catch (error: any) {
    Logger.error(
      `INTERNAL_SERVER_ERROR ${error.message} at sitBotOnTable ${tableId}`,
      [error],
    );
    throw error;
  } finally {
    try {
      if (lock && lock instanceof Lock) {
        await redlock.Lock.release(lock);
        Logger.info(
          `Lock releasing, in sitBotOnTable; resource:, ${lock.resource}`,
        );
      }
    } catch (err: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error While releasing lock on sitBotOnTable: ${err}`,
        [err],
      );
    }
  }
}

function makeid(length) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(
      Math.floor(Math.random() * charactersLength),
    );
    counter += 1;
  }
  return result;
}

///k

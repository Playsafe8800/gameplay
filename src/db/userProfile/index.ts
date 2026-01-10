import { Logger } from '../../newLogger';
import { TABLE_PREFIX } from '../../constants';
import { ERROR_CAUSES } from '../../constants/errors';
import { UserProfile as UserProfileInterface } from '../../objectModels';
import { getIdPrefix } from '../../utils';
import { CancelBattleError } from '../../utils/errors';
import { userProfileValidator } from '../../validators/model.validator';
import {
  getValueFromKey,
  setValueInKeyWithExpiry,
} from '../redisWrapper';
import userServiceExt from '../../userService';

class UserProfile {
  generateUserDetailsKey(userId: number): string {
    return `${getIdPrefix()}:${TABLE_PREFIX.PLAYER}:${userId}`;
  }

  async setUserDetails(
    userId: number,
    userData: UserProfileInterface,
  ) {
    try {
      // @ts-ignore
      userData.tenant = null;
      // userProfileValidator(userData);
      const userKey = this.generateUserDetailsKey(userId);
      await setValueInKeyWithExpiry(userKey, userData);
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error occurred in setUserDetails ${error.message} ${error}`,
      );
      throw new CancelBattleError(
        error.message,
        ERROR_CAUSES.VALIDATION_ERROR,
      );
    }
  }

  async removeTableIdFromProfile(userId: number, tableId: string) {
    const userData = await this.getUserDetailsById(userId);
    if (userData && userData.tableIds) {
      userData.tableIds = userData.tableIds.filter((tid) => {
        return tid !== tableId;
      });
      await this.setUserDetails(userId, userData);
    }
  }
  async getUserDetailsById(
    userId,
  ): Promise<UserProfileInterface | null> {
    try {
      const userKey = this.generateUserDetailsKey(userId);
      const user = await getValueFromKey<UserProfileInterface>(
        userKey,
      );
      return user;
    } catch (error: any) {
      Logger.error(
        `INTERNAL_SERVER_ERROR Error occurred in getUserDetailsById ${error.message} ${error}`,
      );
      throw new CancelBattleError(
        error.message,
        ERROR_CAUSES.VALIDATION_ERROR,
      );
    }
  }

  async getOrCreateUserDetailsById(
    userId: number,
    socketId: any = '',
    socketHeaders: any = {},
    unitySessionId = '',
    appType?: string,
  ): Promise<UserProfileInterface> {
    const userKey = this.generateUserDetailsKey(userId);
    let user = await getValueFromKey<UserProfileInterface>(userKey);

    Logger.info('getORcreateUserDetailsById', [user]);

    if (!user || !('tenant' in user)) {
      let userData = await userServiceExt.getUserProfile(userId);
      userData = {
        profile: {
          ...userData,
          userName: userData.username,
          displayName: userData.username,
          profitLoss: userData.profitLosss || 0,
          avatarUrl: '15.png',
          isPrime: false,
          socketId: socketId,
          tableIds: [],
          // headers: "",
          userTablesCash: [],
          unitySessionId: ''
        },
        tenant: null,
      };
      Logger.info(
        `
         ${user}, socketId: ${socketId}`,
        [userData],
      );
      if (userData?.profile) {
        user = this.defaultUserData(
          userData.profile,
          socketId,
          socketHeaders,
          unitySessionId,
          userData.tenant,
        );
        await setValueInKeyWithExpiry(userKey, user);
      } else {
        throw new Error(
          `could not find user details for user ${userId}`,
        );
      }
    } else if (socketId || unitySessionId) {
      if (socketId) user.socketId = socketId;
      if (unitySessionId) user.unitySessionId = unitySessionId;
      await setValueInKeyWithExpiry(userKey, user);
    }
    return user;
  }

  defaultUserData(
    userData: any,
    socketId: string,
    socketHeaders: any,
    unitySessionId: string,
    tenant: any,
  ): UserProfileInterface {
    const { id, displayName, avatarUrl, userName, isPrime } =
      userData;
    return {
      id,
      displayName,
      avatarUrl,
      userName,
      isPrime,
      socketId,
      tableIds: [],
      headers: socketHeaders,
      tenant: `${tenant}`,
      unitySessionId,
      isBot: false,
      level: 'medium',
      userTablesCash: [],
      token: socketHeaders.token,
      profitLoss: 0
    };
  }
}

export const userProfileService = new UserProfile();

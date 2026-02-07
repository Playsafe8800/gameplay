import { UserProfile as UserProfileInterface } from '../../objectModels';
declare class UserProfile {
    generateUserDetailsKey(userId: number): string;
    setUserDetails(userId: number, userData: UserProfileInterface): Promise<void>;
    removeTableIdFromProfile(userId: number, tableId: string): Promise<void>;
    getUserDetailsById(userId: any): Promise<UserProfileInterface | null>;
    getOrCreateUserDetailsById(userId: number, socketId?: any, socketHeaders?: any, unitySessionId?: string, appType?: string): Promise<UserProfileInterface>;
    defaultUserData(userData: any, socketId: string, socketHeaders: any, unitySessionId: string, tenant: any): UserProfileInterface;
}
export declare const userProfileService: UserProfile;
export {};

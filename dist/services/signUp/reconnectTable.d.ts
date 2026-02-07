export declare function reconnectTable(socket: any, connectionType: string): Promise<{
    signupResponse: {
        userId: any;
        username: any;
        profilePicture: any;
        tenant: any;
    };
    gameTableInfoData: any[];
}>;

export declare function handleOpenGamePopup(data: {
    tableId: string;
    action: string;
}, socket: any): Promise<{
    tableId: string;
    action: string;
    message: string;
    isUserPlaying: boolean;
    title: string;
} | {
    success: boolean;
    error: any;
}>;

declare class CustomError extends Error {
    cause: any;
    reason: any;
    retry: any;
    data: any;
    constructor(message: string, cause?: any, data?: any, reason?: any, retry?: any);
}
export = CustomError;

declare function requestHandler(this: any, [eventName, payload, ack]: [any, any, any], next: any): Promise<{
    success: boolean;
    error: any;
} | undefined>;
export = requestHandler;

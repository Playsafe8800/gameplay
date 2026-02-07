declare class EventManager {
    createState(tableId: any): Promise<void>;
    createUserState(tableId: string, userId: number): Promise<void>;
    getInterpreter(): import("xstate").Interpreter<{
        currentPlayers: number;
    }, any, import("xstate").AnyEventObject, {
        value: any;
        context: {
            currentPlayers: number;
        };
    }, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, import("xstate").AnyEventObject, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
    getInterpreterUser(timestamp: string): import("xstate").Interpreter<{
        lastEventTimestamp: string;
    }, any, import("xstate").AnyEventObject, {
        value: any;
        context: {
            lastEventTimestamp: string;
        };
    }, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, import("xstate").AnyEventObject, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
    isEligible(tableId: any, event: any): Promise<{
        isEligible: boolean;
        state: import("xstate").StateValue;
    }>;
    isEligibleUser(tableId: string, userId: number, timestamp: string): Promise<{
        isEligible: boolean;
        state: any;
        timestamp: any;
    }>;
    fireEvent(tableId: any, event: any): Promise<void>;
    fireEventUser(tableId: string, userId: number, event: string, timestamp: string): Promise<void>;
    getCurrentState(tableId: any): Promise<import("xstate").StateValue>;
}
export declare const eventStateManager: EventManager;
export {};

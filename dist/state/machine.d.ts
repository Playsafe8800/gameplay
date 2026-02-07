export declare const machine: import("xstate").StateMachine<{
    currentPlayers: number;
}, any, import("xstate").AnyEventObject, {
    value: any;
    context: {
        currentPlayers: number;
    };
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, import("xstate").AnyEventObject, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
export declare const userMachine: import("xstate").StateMachine<{
    lastEventTimestamp: string;
}, any, import("xstate").AnyEventObject, {
    value: any;
    context: {
        lastEventTimestamp: string;
    };
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, import("xstate").AnyEventObject, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;

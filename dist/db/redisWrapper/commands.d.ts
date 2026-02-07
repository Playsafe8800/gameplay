declare class Commands {
    private redisClient;
    constructor();
    get keyCommands(): any;
    get setCommands(): {
        push: any;
        pop: any;
        rem: any;
        lrange: any;
    };
    get sortedSetCommands(): any;
    get queueCommands(): {
        push: any;
        pop: any;
        peek: any;
    };
    get hashCommand(): any;
}
declare const commands: Commands;
export = commands;

export type Meld = 'dwd' | 'pure' | 'seq' | 'set';
export declare enum MeldLabel {
    FIRST_LF = "FirstLife",
    SECOND_LF = "SecondLife",
    PURE_SEQ = "Pure",
    IMPURE_SEQ = "Impure",
    FIRST_LF_NEEDED = "FirstLifeNeeded",
    SECOND_LF_NEEDED = "SecondLifeNeeded",
    SET = "Set",
    INVALID = "Invalid",
    NONE = "None"
}
export declare enum MELD {
    PURE = "pure",
    SEQUENCE = "seq",
    SET = "set",
    DWD = "dwd"
}
export interface cardSplitView {
    suit: string;
    deck: number;
    rank: number;
}
export interface splitArrayInterface {
    family: Array<string>;
    deck: Array<string>;
    card: Array<string>;
}
export interface UserTossCardInterface {
    userId: number;
    seatIndex: number;
    tossCard: string;
    tossWinner?: boolean;
}

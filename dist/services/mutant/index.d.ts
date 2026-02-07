import { ScoreBoardPlayerInfoData } from '../../objectModels';
declare class MutantService {
    addTenantToPlayerInfo(playerInfo: Array<ScoreBoardPlayerInfoData>): Promise<ScoreBoardPlayerInfoData[]>;
}
export declare const mutantService: MutantService;
export {};

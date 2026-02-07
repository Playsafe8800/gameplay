import { LobbyGameConfig, TableConfiguration as TableConfigurationInterface } from '../../objectModels';
declare class TableConfiguration {
    private getTableConfigurationKey;
    private getLobbyDetailsKey;
    deleteTable(tableId: string): Promise<unknown>;
    getTableConfiguration(tableId: string, args: string[]): Promise<any>;
    setTableConfiguration(tableId: string, tableConfigurationData: any, initial?: boolean): Promise<void>;
    getLobbyDetailsForMM(lobbyId: number): Promise<TableConfigurationInterface>;
    updateCurrentRound(tableId: string, currentRound: number): Promise<void>;
    deleteTableConfiguration(tableId: string): Promise<void>;
    /**
     *
     * @param LobbyTableConfig {LobbyGameConfig}
     * @param tableId pass when tableId is available (optional)
     *
     */
    getDefaultTableConfigRedisObject(LobbyTableConfig: LobbyGameConfig, tableId?: string): TableConfigurationInterface;
}
export declare const tableConfigurationService: TableConfiguration;
export {};

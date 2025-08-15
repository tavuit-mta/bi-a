import { PlayerModel } from './player.model';
import { GameResult } from './game-result.model';
import { BillTable, GameSetting } from './game-setting.model';

export interface GameState {
  players: PlayerModel[];
  results: GameResult[];
  gameSetting: GameSetting;
  billTable: Record<string, BillTable[]>;
}

export enum ModalMode {
  Add = 'add',
  Edit = 'edit',
  View = 'view',
}
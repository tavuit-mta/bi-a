import { PlayerModel } from './player.model';
import { GameResult } from './game-result.model';
import { GameSetting } from './game-setting.model';

export interface GameState {
  players: PlayerModel[];
  results: GameResult[];
  gameSetting: GameSetting;
}

export enum ModalMode {
  Add = 'add',
  Edit = 'edit',
  View = 'view',
}
import { Player, PlayerModel } from './player.model';
import { GameResult } from './game-result.model';

export interface GameState {
  players: PlayerModel[];
  results: GameResult[];
}

export enum ModalMode {
  Add = 'add',
  Edit = 'edit',
  View = 'view',
}
import { Player } from './player.model';
import { GameResult } from './game-result.model';

export interface GameState {
  players: Player[];
  results: GameResult[];
}

export enum ModalMode {
  Add = 'add',
  Edit = 'edit',
  View = 'view',
}
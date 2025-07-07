import { Player } from './player.model';
import { GameResult } from './game-result.model';

export interface GameState {
  players: Player[];
  results: GameResult[];
}

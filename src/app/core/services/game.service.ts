import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GameState } from '../../models/game-state.model';
import { Player } from '../../models/player.model';
import { GameResult } from '../../models/game-result.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly STORAGE_KEY = 'billiards_game_state';

  private _gameState$ = new BehaviorSubject<GameState>({
    players: [],
    results: []
  });

  public gameState$ = this._gameState$.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  getPlayers(): Player[] {
    return this._gameState$.value.players;
  }

  setPlayers(players: Player[]): void {
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      players
    };
    this._gameState$.next(newState);
    this.saveToStorage();
  }

  addPlayer(player: Player): void {
    const current = this._gameState$.value;
    const newPlayers = [...current.players, player];
    this.setPlayers(newPlayers);
  }

  addPlayerToResults(player: Player): void {
    const current = this._gameState$.value;
    const numPlayers = current.players.length;
    const newResults = (current.results || []).map(result => {
      // Pad scores array to match new number of players
      const scores = [...result.scores];
      while (scores.length < numPlayers) {
        scores.push(0);
      }
      return { ...result, scores };
    });
    const newState: GameState = {
      ...current,
      results: newResults
    };
    this._gameState$.next(newState);
    this.saveToStorage();
  }

  removePlayer(playerId: number, index: number): void {
    const current = this._gameState$.value;
    // Remove player from players array
    const newPlayers = current.players.filter(p => p.id !== playerId);
    // Remove the player's score from each result
    const newResults = (current.results || []).map(result => {
      const scores = [...result.scores];
      scores.splice(index, 1);
      // After removal, ensure sum is still zero (if not, adjust last player)
      const sum = scores.reduce((a, b) => a + b, 0);
      if (sum !== 0 && scores.length > 0) {
        scores[scores.length - 1] -= sum;
      }
      return { ...result, scores };
    });
    const newState: GameState = {
      ...current,
      players: newPlayers,
      results: newResults
    };
    this._gameState$.next(newState);
    this.saveToStorage();
  }

  addGameResult(result: GameResult): void {
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      results: [...current.results, result]
    };
    this._gameState$.next(newState);
    this.saveToStorage();
  }

  resetGame(): void {
    const newState: GameState = {
      players: [],
      results: []
    };
    this._gameState$.next(newState);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private saveToStorage(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(this._gameState$.value)
    );
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw) as GameState;
        this._gameState$.next(data);
      } catch {
        this.resetGame();
      }
    }
  }
}

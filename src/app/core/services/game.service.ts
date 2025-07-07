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

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GameState } from '../../models/game-state.model';
import { Player } from '../../models/player.model';
import { GameResult, PenaltyDetail } from '../../models/game-result.model';
import { AppService } from '../../app.service';

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

  constructor(
    private appService: AppService
  ) {
    this.loadFromStorage();
  }

  getPlayers(): Player[] {
    return this._gameState$.value.players;
  }

  pushGameData(result: GameState): void {
    console.log('Pushing game data:', result);
    this._gameState$.next(result);
  }

  setPlayers(players: Player[]): void {
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      players
    };
    this.pushGameData(newState);
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
      // Pad scores and commonPoints arrays to match new number of players
      const scores = [...result.scores];
      const commonPoints = result.commonPoints ? [...result.commonPoints] : [];
      while (scores.length < numPlayers) scores.push(0);
      while (commonPoints.length < numPlayers) commonPoints.push(0);
      // No change to penalties, as they are per-game
      return { ...result, scores, commonPoints };
    });
    const newState: GameState = {
      ...current,
      results: newResults
    };
    this.pushGameData(newState);
    this.saveToStorage();
  }

  removePlayer(playerId: number, index: number): void {
    const current = this._gameState$.value;
    // Remove player from players array
    const newPlayers = current.players.filter(p => p.id !== playerId);
    // Remove the player's score and commonPoints from each result
    const newResults = (current.results || []).map(result => {
      const scores = [...result.scores];
      const commonPoints = result.commonPoints ? [...result.commonPoints] : [];
      scores.splice(index, 1);
      if (commonPoints.length > index) commonPoints.splice(index, 1);
      // Remove player from players array for this game if present
      const players = result.players ? result.players.filter((p, i) => i !== index) : [];
      // Remove penalties involving this player
      const penalties = result.penalties
        ? result.penalties.filter(
          pen => pen.payerId !== playerId && pen.receiverId !== playerId
        )
        : [];
      // After removal, ensure sum is still zero (if not, adjust last player)
      const sum = scores.reduce((a, b) => a + b, 0);
      if (sum !== 0 && scores.length > 0) {
        scores[scores.length - 1] -= sum;
      }
      return { ...result, scores, commonPoints, players, penalties };
    });
    const newState: GameState = {
      ...current,
      players: newPlayers,
      results: newResults
    };
    this.pushGameData(newState);
    this.saveToStorage();
  }

  initGameResults(result: GameState): Promise<void> {
    return new Promise<void>((resolve) => {
      this._gameState$.next(result);
      resolve();
    })
  }

  observeGameState(): void {
    if (this.appService.isServer) {
      return
    }
    console.log('Observing game state from server...');    
    this.appService.getGameData(this);
  }

  addGameResult(result: GameResult): void {
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      results: [...current.results, result]
    };
    this.pushGameData(newState);
    this.saveToStorage();
  }

  updateGameResult(index: number, result: GameResult): void {
    const current = this._gameState$.value;
    const newResults = [...current.results];
    newResults[index] = result;
    const newState: GameState = {
      ...current,
      results: newResults
    };
    this.pushGameData(newState);
    this.saveToStorage();
  }

  deleteGameResult(index: number): void {
    const current = this._gameState$.value;
    const newResults = [...current.results];
    newResults.splice(index, 1);
    const newState: GameState = {
      ...current,
      results: newResults
    };
    this.pushGameData(newState);
    this.saveToStorage();
  }

  resetGame(): void {
    const newState: GameState = {
      players: [],
      results: []
    };
    this.pushGameData(newState);
    localStorage.removeItem(this.STORAGE_KEY);
    this.appService.removeGameData();
  }

  private saveToStorage(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(this._gameState$.value)
    );
    this.appService.pushGameData(this._gameState$.value);
  }

  private loadFromStorage(): void {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw) as GameState;
        // Backward compatibility: ensure all new fields exist
        data.results = (data.results || []).map(result => ({
          nPlayers: result.nPlayers ?? (result.scores ? result.scores.length : 0),
          players: result.players ?? [],
          winnerId: result.winnerId ?? null,
          scores: result.scores ?? [],
          commonPoints: result.commonPoints ?? [],
          penalties: result.penalties ?? [],
          remainingPoints: result.remainingPoints ?? []
        }));
        this.pushGameData(data);
      } catch {
        this.resetGame();
      }
    }
  }
}

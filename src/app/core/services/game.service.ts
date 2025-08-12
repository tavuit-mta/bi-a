import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameState } from '../../models/game-state.model';
import { Player, PlayerModel } from '../../models/player.model';
import { GameResult } from '../../models/game-result.model';
import { AppService } from '../../app.service';
import { CURRENCY_NUMBER_KEY, GAME_STATE_KEY } from '../constants/core.constant';
import { GameSetting } from '../../models/game-setting.model';
import { Device } from '@capacitor/device';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private _gameState$ = new BehaviorSubject<GameState>({
    players: [],
    results: [],
    gameSetting: {
      gameUnit: undefined,
      deviceServer: undefined
    }
  });

  private _unit$ = new BehaviorSubject<number | null>(10000);

  public unit$ = this._unit$.asObservable();
  public gameState$ = this._gameState$.asObservable();

  constructor(
    private appService: AppService
  ) {
    this.loadFromStorage();
  }

  async updateGameSetting(): Promise<void> {
    console.log('Updating game setting...');
    const setting: GameSetting = {
      gameUnit: this._unit$.value?.toString(),
      deviceServer: localStorage.getItem('DEVICE_ID_KEY') || (await Device.getId()).identifier
    }
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      gameSetting: setting
    };
    this.pushGameData(newState);
    this.saveToStorage();
  }

  setGameUnit(unit: number): void {
    localStorage.setItem(CURRENCY_NUMBER_KEY, unit.toString());
    this._unit$.next(unit);
  }

  getPlayers(): Player[] {
    return this._gameState$.value.players;
  }

  pushGameData(result: GameState): void {
    console.log('Pushing game data:', result);
    const resultObject = {
      results: result.results,
      players: result.players.map(player => new PlayerModel({ ...player })) as PlayerModel[],
      gameSetting: result.gameSetting
    }
    this._gameState$.next(resultObject);
  }

  putPlayer(player: PlayerModel): void {
    const current = this._gameState$.value;
    const players = current.players.map(p => p.index === player.index ? player : p);
    const newState: GameState = {
      ...current,
      players
    };
    console.log('Updating player:', player);
    this.pushGameData(newState);
    this.saveToStorage();
  }

  setPlayers(players: PlayerModel[]): void {
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      players
    };
    console.log('Saving players:', players);
    this.pushGameData(newState);
    this.saveToStorage();
  }

  addPlayer(player: PlayerModel): void {
    const current = this._gameState$.value;
    const newPlayers = [...current.players, player];
    console.log('Adding player:', player);
    this.setPlayers(newPlayers);
  }

  addPlayerToResults(player: PlayerModel): void {
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
    console.log('Adding player to results:', player);
    this.pushGameData(newState);
    this.saveToStorage();
  }

  removePlayer(playerId: number, index: number): void {
    const current = this._gameState$.value;
    // Remove player from players array
    const newPlayers = current.players.filter(p => p.index !== playerId);
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
    console.log('Removing player:', playerId);
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
    console.log('Observing game state from server...');
    this.appService.isRunningGame$.next(true);
    this.appService.getGameData(this);
  }

  addGameResult(result: GameResult): void {
    const current = this._gameState$.value;
    const newState: GameState = {
      ...current,
      results: [...current.results, result]
    };
    console.log('Adding game result:', result);
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
    console.log('Updating game result at index', index, ':', result);
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
    console.log('Deleting game result at index', index);
    this.pushGameData(newState);
    this.saveToStorage();
  }

  async resetGame(): Promise<void> {
    return this.appService.removeGameData(this).then(() => {
      const newState: GameState = {
        players: [],
        results: [],
        gameSetting: {
          gameUnit: undefined,
          deviceServer: undefined
        }
      };
      this.pushGameData(newState);
    });
  }

  saveToStorage(data: GameState = this._gameState$.value, pushToFB: boolean = true): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const preData = localStorage.getItem(GAME_STATE_KEY);

      if (preData === JSON.stringify(data)) {
        console.log('No changes detected, skipping storage update.');
        return resolve(false);
      }

      localStorage.setItem(
        GAME_STATE_KEY,
        JSON.stringify(data)
      );

      if (pushToFB) {
        this.appService.pushGameData(JSON.parse(JSON.stringify(data)));
      }
      return resolve(true);
    });
  }

  loadFromStorage(): void {
    const raw = localStorage.getItem(GAME_STATE_KEY);
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
        console.log('Loaded game state from storage:', data);
        this.pushGameData(data);
      } catch {
        this.resetGame();
      }
    }
    const unit = localStorage.getItem(CURRENCY_NUMBER_KEY);
    if (unit) {
      this._unit$.next(Number(unit));
      console.log('Loaded game unit from storage:', unit);
    }
  }

  /**
 * Tính toán các giao dịch cần thiết để cân bằng điểm số của người chơi.
 * @param {Object} scores - Một object với key là tên người chơi và value là điểm số.
 * @returns {Array<string>} - Một mảng chứa các chuỗi mô tả giao dịch.
 */
  calculateTransactions(scores: { [key: string]: number }): string[] {
    // 1. Tách người chơi thành hai nhóm: nợ (điểm âm) và nhận (điểm dương)
    const debtors = Object.entries(scores)
      .filter(([name, score]) => score < 0)
      .map(([name, score]) => ({ name, amount: -score })); // Chuyển điểm âm thành số dương để tính toán

    const creditors = Object.entries(scores)
      .filter(([name, score]) => score > 0)
      .map(([name, score]) => ({ name, amount: score }));

    const transactions = [];

    // 2. Xử lý giao dịch cho đến khi không còn ai nợ hoặc không còn ai cần nhận
    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];

      // 3. Xác định số tiền chuyển là số nhỏ hơn giữa số nợ và số cần nhận
      const amountToTransfer = Math.min(debtor.amount, creditor.amount);

      const numberToTransfer = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amountToTransfer * (this._unit$.value || 1));

      // Ghi nhận giao dịch
      transactions.push(`
        ${debtor.name} chuyển cho ${creditor.name}: ${numberToTransfer}
      `);

      // 4. Cập nhật lại số tiền của người nợ và người nhận
      debtor.amount -= amountToTransfer;
      creditor.amount -= amountToTransfer;

      // 5. Nếu ai đã hết nợ hoặc nhận đủ, loại bỏ họ khỏi danh sách xử lý
      if (debtor.amount === 0) {
        debtors.shift(); // Xóa người nợ đầu tiên khỏi mảng
      }
      if (creditor.amount === 0) {
        creditors.shift(); // Xóa người nhận đầu tiên khỏi mảng
      }
    }
    return transactions;
  }
}

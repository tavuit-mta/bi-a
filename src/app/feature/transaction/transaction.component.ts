import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { PlayerModel } from '../../models/player.model';
import { GameService } from '../../core/services/game.service';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { GameState } from '../../models/game-state.model';
import { BillTable } from '../../models/game-setting.model';
import { GameResult } from '../../models/game-result.model';


@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.scss'
})
export class TransactionComponent implements OnDestroy, OnInit {
  onDestroy$: Subject<void> = new Subject<void>();
  gameState!: GameState;
  totalScores: string[] = [];
  displayedColumns: string[] = [];
  transactions: BillTable[] = [];
  unit: number = 1;
  constructor(
    private router: Router,
    private gameService: GameService
  ) {
    this.gameService.unit$
      .pipe(
        takeUntil(this.onDestroy$),
      )
      .subscribe((unit) => {
        this.unit = unit || 1;
      });
  }

  get players(): PlayerModel[] {
    return this.gameState.players.map(p => new PlayerModel({ ...p })) as PlayerModel[];
  }

  getPlayerFromProfileID(profileId: string): string {
    return this.players.find(p => p.profileId === profileId)?.name || '';
  }

  getAvatarFromProfileID(profileId: string): string {
    return this.players.find(p => p.profileId === profileId)?.avatar || '';
  }

  getAmount(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount * this.unit);
  }

  getScore(player: PlayerModel): number {
    const playerIndex = this.gameState.players.findIndex(p => p.index === player.index);
    if (playerIndex === -1) {
      return 0;
    }
    return this.gameState.results[playerIndex].scores[playerIndex] || 0;
  }

  backToHome() {
    this.router.navigate(['/board']);
  }

  columnKeyBuilder(player: PlayerModel): string {
    return JSON.stringify(player);
  }

  ngOnInit(): void {
    this.gameService.gameState$
      .pipe(takeUntil(this.onDestroy$),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe(state => {
        this.gameState = {
          players: state.players.map((p: PlayerModel) => ({ ...p } as PlayerModel)),
          results: [...state.results],
          gameSetting: state.gameSetting,
          billTable: [...state.billTable]
        };
        this.calculateTotals();
      });

    this.transactions = this.gameService.calculateTransactions();
    const displayedColumns = this.players.map(p => this.columnKeyBuilder(p));
    this.displayedColumns = ['title', ...displayedColumns];
  }

  private calculateTotals(): void {
    if (!this.gameState || !this.gameState.players) {
      this.totalScores = [];
      return;
    }
    const numPlayers = this.gameState.players.length;
    const totals = new Array(numPlayers).fill(0);

    if (this.gameState.results && this.gameState.results.length) {
      for (const result of this.gameState.results) {
        for (let i = 0; i < numPlayers; i++) {
          var playerIndex = result.players.findIndex(p => p.index === this.gameState.players[i].index);
          if (playerIndex !== -1) {
            totals[i] += result.scores[playerIndex] || 0;
          }
        }
      }
    }
  
    this.totalScores = totals.map(t => this.getAmount(t));
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

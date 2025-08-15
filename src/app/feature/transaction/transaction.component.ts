import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { PlayerModel } from '../../models/player.model';
import { GameService } from '../../core/services/game.service';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { GameState, ModalMode } from '../../models/game-state.model';
import { Transaction } from '../../models/game-setting.model';
import { AddBillComponent } from '../add-bill/add-bill.component';
import { AppService } from '../../app.service';


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
    MatDividerModule,
    MatListModule
  ],
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.scss'
})
export class TransactionComponent implements OnDestroy, OnInit, AfterViewInit {
  onDestroy$: Subject<void> = new Subject<void>();
  gameState!: GameState;
  totalScores: number[] = [];
  displayedColumns: string[] = [];
  subtotalFooterColumns: string[] = [];
  grandtotalFooterColumns: string[] = [];
  transactions: Transaction[] = [];
  unit: number = 1;

  isServerMode = false;
  constructor(
    private router: Router,
    private gameService: GameService,
    private appService: AppService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.gameService.unit$
      .pipe(
        takeUntil(this.onDestroy$),
      )
      .subscribe((unit) => {
        this.unit = unit || 1;
      });

    this.appService.isServer().then(isServer => {
      this.isServerMode = isServer;
      console.log('Is server mode:', this.isServerMode);
    }).catch(err => {
      console.error('Error checking server mode:', err);
      this.isServerMode = false;
    });
  }

  get players(): PlayerModel[] {
    return this.gameState.players.map(p => new PlayerModel({ ...p })) as PlayerModel[];
  }

  get bills(): string[] {
    return Object.keys(this.gameState.billTable);
  }

  getBillAmount(billID: string, player: PlayerModel): string {
    const bill = this.gameState.billTable[billID];
    if (!bill) {
      return "";
    }
    
    const payer = bill.find(b => b.payer === player.profileId);
    if (payer) {
      return "Thanh toán";
    }

    const playerBill = bill.find(b => b.debtor === player.profileId);
    if (!playerBill) {
      return "-";
    }

    return this.getAmount(playerBill.amount, 1);
  }

  getPlayerFromProfileID(profileId: string): string {
    return this.players.find(p => p.profileId === profileId)?.name || '';
  }

  getAvatarFromProfileID(profileId: string): string {
    return this.players.find(p => p.profileId === profileId)?.avatar || '';
  }

  getAmount(amount: number, unit: number = this.unit): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount * unit);
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

  subTotalKeyBuilder(player: PlayerModel): string {
    return 'sub' + JSON.stringify(player);
  }

  grandTotalKeyBuilder(player: PlayerModel): string {
    return 'grand' + JSON.stringify(player);
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
          billTable: {...state.billTable}
        };

        this.calculateTotals();
      });

    const displayedColumns = this.players.map(p => this.columnKeyBuilder(p));
    const subtotalFooterColumns = this.players.map(p => this.subTotalKeyBuilder(p));
    const grandtotalFooterColumns = this.players.map(p => this.grandTotalKeyBuilder(p));
    this.displayedColumns = ['title', ...displayedColumns, 'action'];
    this.subtotalFooterColumns = ['subTotal', ...subtotalFooterColumns, 'action_sub'];
    this.grandtotalFooterColumns = ['grandTotal', ...grandtotalFooterColumns, 'action_grand'];
  }

  ngAfterViewInit(): void {
    this.calculateTransactions();
    this.cdr.detectChanges();
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
    this.totalScores = totals;
  }

  getSum(player: PlayerModel, index: number): string {
    let billAmount = Number(this.totalScores[index]) * this.unit;
    const bills = Object.keys(this.gameState.billTable);
    for (const billID of bills) {
      const bill = this.gameState.billTable[billID];      
      const payer = bill.find(b => b.payer === player.profileId);
      if (payer) {
        billAmount += bill.filter(b => b.debtor !== player.profileId).reduce((acc, b) => acc + b.amount, 0);
        continue;
      }

      const playerBill = bill.find(b => b.debtor === player.profileId);
      if (!playerBill) {
        billAmount += 0;
        continue;
      }
      billAmount -= playerBill.amount;
    }
    this.gameService.playerScores[player.profileId] = billAmount;
    return this.getAmount(billAmount, 1);
  }

  calculateTransactions(): void {
    this.transactions = this.gameService.calculateTransactions();
  }

  openAddBill(): void {
    const dialogRef = this.dialog.open(AddBillComponent, {
      width: '90%',
      disableClose: true,
      backdropClass: 'blurred-backdrop',
      panelClass: 'custom-dialog-panel'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe((result) => {
      this.calculateTransactions();
    });
  }

  openEditbill(billID: string): void {
    const billData = this.gameState.billTable[billID];
    const dialogRef = this.dialog.open(AddBillComponent, {
      width: '90%',
      disableClose: true,
      backdropClass: 'blurred-backdrop',
      panelClass: 'custom-dialog-panel',
      data: { bill: billData, mode: ModalMode.Edit }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe((result) => {
      this.calculateTransactions();
    });
  }

  deleteBill(billID: string): void {
    const confirmed = confirm('Bạn có chắc chắn muốn xóa bill này?');
    if (!confirmed) return;
    this.appService.startLoading();
    this.gameService.deleteBill(billID).then(()=>{
      setTimeout(()=>{
        this.calculateTransactions();
        this.appService.stopLoading
      }, 1000);
    }).finally(()=>{
      this.appService.stopLoading();
    });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

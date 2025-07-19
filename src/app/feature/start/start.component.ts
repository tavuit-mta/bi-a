import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AppService } from '../../app.service';
import { v4 as uuidv4 } from 'uuid';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subject, takeUntil } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

@Component({
  standalone: true,
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  imports: [
    MatButtonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ]
})
export class StartComponent implements OnDestroy {
  showJoinGame = false;
  joinGameCode = '';
  onDestroy$: Subject<void> = new Subject<void>();
  startScanning = false;
  // This binds the 'scanner-active' class to the host element (<app-your-page>)
  @HostBinding('class.scanner-active') scannerActive = false;

  constructor(private router: Router, private appService: AppService, private gameService: GameService) {
    if (this.appService.hasStartedGame()) {
      console.log('Game already started, redirecting to setup...');
      this.joinGameCode = this.appService.getGamePath();
      this.loadGameData();
    }
  }

  startGame(): void {
    const GAME_ID = uuidv4();
    this.appService.initializeGame(GAME_ID).then(() => {
      this.appService.storeGamePath(GAME_ID, 'true');
      this.router.navigate(['/setup']);
    })
  }

  stopScanQR(): void {
    BarcodeScanner.stopScan();
    BarcodeScanner.showBackground();
    this.startScanning = false;
    this.scannerActive = false; // Deactivate our CSS styles
  }

  async scanQR(): Promise<void> {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      this.startScanning = true;
      this.scannerActive = true; // Activate our CSS styles

      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        this.startScanning = false;
        const scannedCode = result.content;
        this.joinGameCode = scannedCode;
        BarcodeScanner.stopScan();
        this.confirmJoinGame();
      }

      this.stopScanQR();
      
    } catch (error) {
      this.startScanning = false;
      alert('Failed to scan QR code. Please try again.');
    }
  }

  joinGame(): void {
    this.showJoinGame = true;
  }

  confirmJoinGame(): void {
    this.appService.initializeGame(this.joinGameCode, true)
      .then((gameData: GameState) => {
        const players = gameData?.players;
        if (!players) {
          alert('Trò chơi không có người chơi. Vui lòng tạo một trò chơi mới.');
          return;
        }
        this.loadGameData(gameData);
      })
      .catch(() => {
        alert('Không thể tham gia trò chơi. Vui lòng kiểm tra mã trò chơi và thử lại.');
      });
  }

  loadGameData(gameData: GameState | null = null): void {
    if (gameData && gameData.players && gameData.players.length > 0) {
      this.gameService.pushGameData(gameData);
      this.appService.storeGamePath(this.joinGameCode, 'false');
      this.router.navigate(['/board']);
      return;
    }
    this.appService.getGameDataOnce()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((gameState: GameState) => {
        if (gameState?.players?.length > 0) {
          this.gameService.pushGameData(gameState);
          this.appService.storeGamePath(this.joinGameCode, 'false');
          this.router.navigate(['/board']);
        } else {
          this.appService.deleteGameData();
        }
      });
  }

  cancelJoinGame(): void {
    this.showJoinGame = false;
    this.joinGameCode = '';
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

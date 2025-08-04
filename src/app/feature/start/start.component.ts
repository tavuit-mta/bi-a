import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AppService } from '../../app.service';
import { v6 as uuidv6 } from 'uuid';
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
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { SetupComponent } from '../game-setup/setup.component';

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
  private manifestUrl = 'https://raw.githubusercontent.com/tavuit-mta/bi-a/refs/heads/main/BilliardScore/manifest.plist';

  constructor(
    private router: Router,
    private appService: AppService,
    private gameService: GameService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
  ) {
    if (this.appService.hasStartedGame()) {
      console.log('Game already started, redirecting to setup...');
      this.joinGameCode = this.appService.getGamePath();
      if (!this.joinGameCode) {
        console.error('No game path found in local storage.');
        return;
      }
      this.loadGameData();
    }
  }

  openSetup(): void {
    this.dialog.open(SetupComponent, {
      width: '90%',
      backdropClass: 'blurred-backdrop',
      panelClass: 'custom-dialog-panel'
    })
  }

  startGame(): void {
    this.appService.startLoading();
    const options = {
      node: Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab),
      clockseq: 0x1234,
      msecs: new Date().getTime(),
      nsecs: 5678,
    };
    const GAME_ID = uuidv6(options).toLocaleUpperCase();
    this.appService.initializeGame(GAME_ID).then(() => {
      this.appService.storeGamePath(GAME_ID);
      this.openSetup();
    }).finally(() => {
      this.appService.stopLoading();
    });
  }

  stopScanQR(): void {
    BarcodeScanner.stopScan();
    BarcodeScanner.showBackground();
    this.startScanning = false;
    this.scannerActive = false; 
  }

  async scanQR(): Promise<void> {
    try {
      await BarcodeScanner.checkPermission({ force: true });
      BarcodeScanner.hideBackground();
      this.startScanning = true;
      this.scannerActive = true;

      const result = await BarcodeScanner.startScan({
        cameraDirection: 'back'
      });

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
      this.appService.storeGamePath(this.joinGameCode);
      this.openSetup();
      return;
    }
    this.appService.getGameDataOnce().then((gameState: GameState | undefined) => {
      if (gameState && gameState?.players?.length > 0) {
          this.gameService.pushGameData(gameState);
          this.appService.storeGamePath(this.joinGameCode);
          this.appService.startLoading();
          setTimeout(()=>{
            this.router.navigate(['/board']);
            this.appService.stopLoading();
          }, 2000);
        } else {
          this.appService.deleteGameData(this.gameService);
        }
    })
  }

  cancelJoinGame(): void {
    this.showJoinGame = false;
    this.joinGameCode = '';
  }

  downloadApp(): SafeUrl {
    const url = `itms-services://?action=download-manifest&url=${this.manifestUrl}`;
    // Bỏ qua kiểm tra bảo mật của Angular cho URL itms-services
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  ngOnDestroy(): void {
    console.log('StartComponent destroyed');
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

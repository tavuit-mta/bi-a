import { Component, OnDestroy, OnInit, ViewChild, ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { Player, PlayerModel } from '../../models/player.model';
import { GameResult } from '../../models/game-result.model';
import { AddGameDialogComponent } from '../add-game-dialog/add-game-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ModalMode } from '../../models/game-state.model';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media, MediaSaveOptions } from '@capacitor-community/media';
import { AppService } from '../../app.service';
import { QrGameComponent } from '../qr-game/qr-game.component';
import { Profile } from '../../models/profile.model';
import { MatChipsModule } from '@angular/material/chips';
import { ProfileService } from '../../core/services/profile.service';
import { Unsubscribe } from '@angular/fire/firestore';
import { TransactionComponent } from '../transaction/transaction.component';

@Component({
  standalone: true,
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
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
    MatChipsModule
  ],
})
export class BoardComponent implements OnInit, OnDestroy {
  onDestroy$: Subject<void> = new Subject<void>();

  gameState!: GameState;
  displayedColumns: string[] = [];
  totalScores: number[] = [];
  playerScores: Record<string, number> = {};
  private sub!: Subscription;

  @ViewChild('tableWrapper', { static: false }) tableWrapper!: ElementRef<HTMLDivElement>;

  showAddPlayerInput = false;
  addPlayerName = '';
  addPlayerError = '';
  showTotalRow = false;

  album = 'BilliardScore';
  isServerMode = false;

  currentProfile!: Profile;

  get players(): PlayerModel[] {
    return this.gameState.players.map(p => new PlayerModel({ ...p })) as PlayerModel[];
  }

  constructor(
    private appService: AppService,
    private gameService: GameService,
    private profileService: ProfileService,
    private dialog: MatDialog,
    private router: Router,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {
    this.isServerMode = this.appService.isServer;
    if (this.gameService.getPlayers().length === 0) {
      this.router.navigate(['/']);
    }
    this.profileService.getProfile()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((profile: Profile) => {
        this.currentProfile = profile;
      });
    this.profileService.loadProfile();
  }

  ngOnInit(): void {
    this.gameService.gameState$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(state => {
        this.gameState = {
          players: state.players.map((p: PlayerModel) => ({ ...p } as PlayerModel)),
          results: [...state.results]
        };
        const displayedColumns = this.gameState.players.map(p => this.columnKeyBuilder(p));
        this.displayedColumns = [...displayedColumns, 'sumLabel'];
        this.calculateTotals();
      });
    this.gameService.observeGameState();
  }

  columnKeyBuilder(player: PlayerModel): string {
    return JSON.stringify(player);
  }

  toggleTotalRow(): void {
    this.showTotalRow = !this.showTotalRow;
    this.cdr.detectChanges(); 
  }

  openAddGameDialog(): void {
    this.dialog.open(AddGameDialogComponent, {
      width: '90%',
      disableClose: true,
      data: { mode: ModalMode.Add }
    });
  }

  // --- Add Player Feature ---
  showAddPlayer(): void {
    this.showAddPlayerInput = true;
    this.addPlayerName = '';
    this.addPlayerError = '';
  }

  cancelAddPlayer(): void {
    this.showAddPlayerInput = false;
    this.addPlayerName = '';
    this.addPlayerError = '';
  }

  confirmAddPlayer(): void {
    const name = this.addPlayerName.trim();
    if (!name) {
      this.addPlayerError = 'Tên không được để trống.';
      return;
    }
    if (this.gameState.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      this.addPlayerError = 'Tên người chơi đã tồn tại.';
      return;
    }
    // Generate a new unique id
    const newId = Math.max(0, ...this.gameState.players.map(p => p.id)) + 1;

    const newPlayer: PlayerModel = new PlayerModel({
      id: newId,
      name,
      profileId: Profile.generateProfileId(),
      avatar: Profile.generateRandomAvatar()
    })

    // Add player to GameService (which will update gameState and persist)
    this.gameService.addPlayer(newPlayer);

    // Add zero scores for all previous results
    this.gameService.addPlayerToResults(newPlayer);

    this.showAddPlayerInput = false;
    this.addPlayerName = '';
    this.addPlayerError = '';
  }

  editGame(result: GameResult, rowIndex: number): void {
    const playersForGame = result.players && result.players.length > 0
      ? result.players
      : this.gameState.players.slice(0, result.nPlayers);

    this.dialog.open(AddGameDialogComponent, {
      width: '90%',
      disableClose: true,
      data: {
        mode: ModalMode.View,
        result: result,
        rowIndex: rowIndex,
        players: playersForGame
      }
    });
  }

  deleteGame(result: GameResult, rowIndex: number): void {
    const confirmed = confirm('Bạn có chắc chắn muốn xóa ván đấu này?');
    if (!confirmed) return;
    this.gameService.deleteGameResult(rowIndex);
  }

  endGame(): void {
    if (confirm('Bạn chắc chắn muốn kết thúc và xóa toàn bộ dữ liệu?')) {
      this.gameService.resetGame();
      this.router.navigate(['/']);
    }
  }

  outGame(): void {
    console.log('Exiting game...');
    this.appService.isRunningGame$.next(false);
    const currentPlayer = this.players.find(p => p.profileId === this.currentProfile.profileId);
    if (currentPlayer) {
      currentPlayer.inactivePlayer();
      this.gameService.putPlayer(currentPlayer);
      const newState: GameState = {
        players: [],
        results: []
      };
      this.gameService.pushGameData(newState);
      setTimeout(()=>{
        this.appService.removeGameData(this.gameService).then(() => {
          this.router.navigate(['/']);
        });
      }, 1000);
    }
  }

  async exportTableAsPngIonic(): Promise<void> {
    if (!this.tableWrapper) return;
    const tableWrapperEl = this.tableWrapper.nativeElement;
    const tableEl = tableWrapperEl.querySelector('table');
    if (!tableEl) return;

    // Save original styles
    const originalOverflow = tableWrapperEl.style.overflow;
    const originalWidth = tableWrapperEl.style.width;
    const originalHeight = tableWrapperEl.style.height;
    const originalScrollLeft = tableWrapperEl.scrollLeft;

    // Expand the scroll wrapper to fit the table for export
    this.renderer.setStyle(tableWrapperEl, 'overflow', 'visible');
    this.renderer.setStyle(tableWrapperEl, 'width', tableEl.scrollWidth + 'px');
    this.renderer.setStyle(tableWrapperEl, 'height', tableEl.scrollHeight + 'px');

    // Optionally, scroll to the left to ensure all content is visible
    tableWrapperEl.scrollLeft = 0;

    try {
      if ((window as any).Capacitor?.isNativePlatform()) {
        if (Filesystem.requestPermissions) {
          await Filesystem.requestPermissions();
        }
      }
    } catch (permErr) {
      alert('Không có quyền truy cập bộ nhớ hoặc thư viện ảnh.');
      return;
    }

    setTimeout(() => {
      html2canvas(tableWrapperEl, {
        backgroundColor: null,
        useCORS: true,
        scale: window.devicePixelRatio || 2,
        scrollX: 0,
        scrollY: 0,
        windowWidth: tableEl.scrollWidth,
        windowHeight: tableEl.scrollHeight
      }).then(async canvas => {
        this.renderer.setStyle(tableWrapperEl, 'overflow', originalOverflow);
        this.renderer.setStyle(tableWrapperEl, 'width', originalWidth);
        this.renderer.setStyle(tableWrapperEl, 'height', originalHeight);
        tableWrapperEl.scrollLeft = originalScrollLeft;

        const base64 = canvas.toDataURL('image/png').split(',')[1];
        const fileName = `billiard-scoreboard-${Date.now()}.png`;

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache
        });

        const albumsResponse = await Media.getAlbums();
        let album = albumsResponse.albums.find(a => a.name === this.album);

        if (!album) {
          await Media.createAlbum({ name: this.album });
          // Refresh albums list
          const newAlbumsResponse = await Media.getAlbums();
          album = newAlbumsResponse.albums.find(a => a.name === this.album);
        }

        const mediaSaveOptions: MediaSaveOptions = {
          path: savedFile.uri,
          albumIdentifier: album?.identifier
        };

        await Media.savePhoto(mediaSaveOptions);
        alert('Ảnh đã được lưu vào thư viện!');
      }).catch(() => {

        this.renderer.setStyle(tableWrapperEl, 'overflow', originalOverflow);
        this.renderer.setStyle(tableWrapperEl, 'width', originalWidth);
        this.renderer.setStyle(tableWrapperEl, 'height', originalHeight);

        tableWrapperEl.scrollLeft = originalScrollLeft;
        alert('Lưu ảnh thất bại!');
      });
    }, 100);
  }

  private calculateTotals(): void {
    if (!this.gameState || !this.gameState.players) {
      this.totalScores = [];
      return;
    }
    const numPlayers = this.gameState.players.length;
    const totals = new Array(numPlayers).fill(0);
    
    this.playerScores = this.gameState.players.map(p => p.name).reduce((acc: Record<string, number>, name) => {
      acc[name] = 0;
      return acc;
    }, {} as Record<string, number>);

    if (this.gameState.results && this.gameState.results.length) {
      for (const result of this.gameState.results) {
        for (let i = 0; i < numPlayers; i++) {
          var playerIndex = result.players.findIndex(p => p.id === this.gameState.players[i].id);
          if (playerIndex !== -1) {
            totals[i] += result.scores[playerIndex] || 0;
            this.playerScores[this.gameState.players[i].name] += result.scores[playerIndex] || 0;
          }
        }
      }
    }
    this.totalScores = totals;
  }

  getScore(player: PlayerModel, result: GameResult): number {
    const playerIndex = result.players.findIndex(p => p.id === player.id);
    if (playerIndex === -1) {
      return 0;
    }
    return result.scores[playerIndex] || 0;
  }

  public calculateTransactions(): void {
    const transactions = this.gameService.calculateTransactions(this.playerScores);
    this.dialog.open(TransactionComponent, {
      data: {
        transactions: transactions,
      }
    });
  }

  public showQrCode(): void {
    this.dialog.open(QrGameComponent);
  }

  ngOnDestroy(): void {
    console.log('BoardComponent destroyed');
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

import { Component, OnDestroy, OnInit, ViewChild, ElementRef, Renderer2, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { PlayerModel } from '../../models/player.model';
import { GameResult } from '../../models/game-result.model';
import { AddGameDialogComponent } from '../add-game-dialog/add-game-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import { ReactiveFormsModule, FormsModule, FormControl, Validators } from '@angular/forms';
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
import { TransactionComponent } from '../transaction/transaction.component';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
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
    MatChipsModule,
    MatMenuModule,
    MatDividerModule
  ],
})
export class BoardComponent implements OnInit, OnDestroy {
  onDestroy$: Subject<void> = new Subject<void>();

  gameState!: GameState;
  displayedColumns: string[] = [];
  totalScores: number[] = [];
  playerScores: Record<string, number> = {};

  @ViewChild('tableWrapper', { static: false }) tableWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('addPlayerDialog', { static: false }) addPlayerDialog!: TemplateRef<HTMLDivElement>;
  @ViewChild(MatMenuTrigger) matMenuTrigger!: MatMenuTrigger;

  showTotalRow = false;

  album = 'BilliardScore';
  isServerMode = false;

  currentProfile!: Profile;

  addPlayerForm: FormControl = new FormControl('', [Validators.required]);
  menuPosition = { x: '0px', y: '0px' };

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
    this.appService.isServer().then(isServer => {
      this.isServerMode = isServer;
      console.log('Is server mode:', this.isServerMode);
    }).catch(err => {
      console.error('Error checking server mode:', err);
      this.isServerMode = false;
    });

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
        const displayedColumns = this.gameState.players.map(p => this.columnKeyBuilder(p));
        this.displayedColumns = [...displayedColumns, 'actions'];
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
      backdropClass: 'blurred-backdrop',
      panelClass: 'custom-dialog-panel',
      data: { mode: ModalMode.Add }
    });
  }

  // --- Add Player Feature ---
  showAddPlayer(): void {
    this.dialog.open(this.addPlayerDialog, {
      width: '90%',
      disableClose: true,
      backdropClass: 'blurred-backdrop',
      panelClass: 'custom-dialog-panel'
    });
  }

  confirmAddPlayer(): void {
    // const name = this.addPlayerName.trim();
    // if (!name) {
    //   this.addPlayerError = 'Tên không được để trống.';
    //   return;
    // }
    // if (this.gameState.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    //   this.addPlayerError = 'Tên người chơi đã tồn tại.';
    //   return;
    // }
    // Generate a new unique index
    const newIndex = Math.max(0, ...this.gameState.players.map(p => p.index)) + 1;

    const newPlayer: PlayerModel = new PlayerModel({
      index: newIndex,
      name: this.addPlayerForm.value.trim(),
      profileId: Profile.generateProfileId(),
      avatar: Profile.generateRandomAvatar()
    });

    // Add player to GameService (which will update gameState and persist)
    this.gameService.addPlayer(newPlayer);

    // Add zero scores for all previous results
    this.gameService.addPlayerToResults(newPlayer);

    this.addPlayerForm.reset();
    this.dialog.closeAll();
  }

  editGame(result: GameResult, rowIndex: number): void {
    const playersForGame = result.players && result.players.length > 0
      ? result.players
      : this.gameState.players.slice(0, result.nPlayers);

    this.dialog.open(AddGameDialogComponent, {
      width: '90%',
      disableClose: true,
      backdropClass: 'blurred-backdrop',
      panelClass: 'custom-dialog-panel',
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
      this.appService.startLoading();
      this.gameService.resetGame().then(() => {
        this.router.navigate(['/']);
      }).finally(() => {
        this.appService.stopLoading();
      })
    }
  }

  outGame(): void {
    this.appService.startLoading();
    console.log('Exiting game...');
    this.appService.isRunningGame$.next(false);
    const currentPlayer = this.players.find(p => p.profileId === this.currentProfile.profileId);
    if (currentPlayer) {
      currentPlayer.inactivePlayer();
      this.gameService.putPlayer(currentPlayer);
      const newState: GameState = {
        players: [],
        results: [],
        gameSetting: {
          gameUnit: undefined,
          deviceServer: undefined
        },
        billTable: []
      };
      this.gameService.pushGameData(newState);
      setTimeout(() => {
        this.appService.removeGameData(this.gameService).then(() => {
          this.router.navigate(['/']);
        }).finally(() => {
          this.appService.stopLoading();
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
    this.displayedColumns = [...this.displayedColumns].filter(col => col !== 'actions'); // Remove actions column for export

    // Optionally, scroll to the left to ensure all content is visible
    tableWrapperEl.scrollLeft = 0;
    this.showTotalRow = true;
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
      }).finally(() => {
        this.showTotalRow = false;
        this.displayedColumns = [...this.displayedColumns, 'actions']; // Restore actions column
      });
    }, 100);
  }

  openBillTable(): void {
    this.router.navigate(['/billing']);
  }

  private calculateTotals(): void {
    if (!this.gameState || !this.gameState.players) {
      this.totalScores = [];
      return;
    }
    const numPlayers = this.gameState.players.length;
    const totals = new Array(numPlayers).fill(0);

    this.playerScores = this.gameState.players.map(p => p.profileId).reduce((acc: Record<string, number>, id) => {
      acc[id] = 0;
      return acc;
    }, {} as Record<string, number>);

    if (this.gameState.results && this.gameState.results.length) {
      for (const result of this.gameState.results) {
        for (let i = 0; i < numPlayers; i++) {
          var playerIndex = result.players.findIndex(p => p.index === this.gameState.players[i].index);
          if (playerIndex !== -1) {
            totals[i] += result.scores[playerIndex] || 0;
            this.playerScores[this.gameState.players[i].profileId] += result.scores[playerIndex] || 0;
          }
        }
      }
    }
    this.totalScores = totals;
    this.gameService.playerScores = this.playerScores
  }

  getScore(player: PlayerModel, result: GameResult): number {
    const playerIndex = result.players.findIndex(p => p.index === player.index);
    if (playerIndex === -1) {
      return 0;
    }
    return result.scores[playerIndex] || 0;
  }

  isWinner(player: PlayerModel, result: GameResult): boolean {
    return player.index === result.winnerId;
  }

  onLongPress(event: MouseEvent | TouchEvent, row: GameResult, rowIndex: number) {
    event.preventDefault(); // Prevent context menu, etc.

    // Get the coordinates from the event
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    // Position the menu at the press location
    this.menuPosition.x = clientX + 'px';
    this.menuPosition.y = clientY + 'px';

    // Pass the row data to the menu
    this.matMenuTrigger.menuData = { item: row, rowIndex };

    // Set the trigger's position and open the menu
    this.matMenuTrigger.openMenu();
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

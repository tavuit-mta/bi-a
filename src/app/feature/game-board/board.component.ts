import { Component, OnDestroy, OnInit, ViewChild, ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { Player } from '../../models/player.model';
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
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ModalMode } from '../../models/game-state.model';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media, MediaSaveOptions } from '@capacitor-community/media';

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
    MatInputModule
  ],
})
export class BoardComponent implements OnInit, OnDestroy {
  gameState!: GameState;
  displayedColumns: string[] = [];
  footerAndDisplayedColumns: string[] = [];
  totalScores: number[] = [];
  private sub!: Subscription;

  @ViewChild('tableWrapper', { static: false }) tableWrapper!: ElementRef<HTMLDivElement>;

  // Add Player UI state
  showAddPlayerInput = false;
  addPlayerName = '';
  addPlayerError = '';
  showTotalRow = false; 

  album = 'BilliardScore'; // Default album name for saving images

  constructor(
    private gameService: GameService,
    private dialog: MatDialog,
    private router: Router,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.sub = this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
      this.displayedColumns = state.players.map(p => p.name);
      this.footerAndDisplayedColumns = [...this.displayedColumns, 'sumLabel'];
      this.calculateTotals();
    });
  }

  toggleTotalRow(): void {
    this.showTotalRow = !this.showTotalRow;
    this.cdr.detectChanges(); // Ensure view updates immediately
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
    const newPlayer: Player = { id: newId, name };

    // Add player to GameService (which will update gameState and persist)
    this.gameService.addPlayer(newPlayer);

    // Add zero scores for all previous results
    this.gameService.addPlayerToResults(newPlayer);

    this.showAddPlayerInput = false;
    this.addPlayerName = '';
    this.addPlayerError = '';
  }

  // --- Remove Player Feature ---
  removePlayer(player: Player, index: number): void {
    if (this.gameState.players.length <= 2) {
      alert('Cần ít nhất 2 người chơi.');
      return;
    }
    const confirmed = confirm(`Bạn có chắc chắn muốn xóa người chơi "${player.name}"?`);
    if (!confirmed) return;
    this.gameService.removePlayer(player.id, index);
  }

  // --- Edit Game Feature ---
  editGame(result: GameResult, rowIndex: number): void {
    // Use the players array stored in the result for this game
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
      this.router.navigate(['/setup']);
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

    if (this.gameState.results && this.gameState.results.length) {
      for (const result of this.gameState.results) {
        // Only sum scores for players that match the main list
        for (let i = 0; i < numPlayers; i++) {
          totals[i] += result.scores[i] || 0;
        }
      }
    }
    this.totalScores = totals;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

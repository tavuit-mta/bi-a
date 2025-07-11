import { Component, OnDestroy, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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

  constructor(
    private gameService: GameService,
    private dialog: MatDialog,
    private router: Router,
    private renderer: Renderer2
  ) { }

  ngOnInit(): void {
    this.sub = this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
      this.displayedColumns = state.players.map(p => p.name);
      this.footerAndDisplayedColumns = ['sumLabel', ...this.displayedColumns, 'actions'];
      this.calculateTotals();
    });
  }

  openAddGameDialog(): void {
    this.dialog.open(AddGameDialogComponent, {
      width: '400px',
      data: { mode: 'add' }
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
    // Find the players for this game (by length of scores array)
    const n = result.scores.length;
    const playersForGame = this.gameState.players.slice(0, n);

    this.dialog.open(AddGameDialogComponent, {
      width: '400px',
      data: {
        mode: 'edit',
        result: result,
        rowIndex: rowIndex,
        players: playersForGame
      }
    });
  }

  endGame(): void {
    if (confirm('Bạn chắc chắn muốn kết thúc và xóa toàn bộ dữ liệu?')) {
      this.gameService.resetGame();
      this.router.navigate(['/setup']);
    }
  }

  exportTableAsPng(): void {
    if (!this.tableWrapper) return;
    const tableWrapperEl = this.tableWrapper.nativeElement;
    const tableEl = tableWrapperEl.querySelector('table');
    if (!tableEl) return;

    // Save original styles
    const originalOverflow = tableWrapperEl.style.overflow;
    const originalWidth = tableWrapperEl.style.width;
    const originalScrollLeft = tableWrapperEl.scrollLeft;

    // Expand the scroll wrapper to fit the table for export
    this.renderer.setStyle(tableWrapperEl, 'overflow', 'visible');
    this.renderer.setStyle(tableWrapperEl, 'width', tableEl.scrollWidth + 'px');

    // Optionally, scroll to the left to ensure all content is visible
    tableWrapperEl.scrollLeft = 0;

    // Wait for the browser to render the new layout
    setTimeout(() => {
      html2canvas(tableWrapperEl, {
        backgroundColor: null,
        useCORS: true,
        scale: window.devicePixelRatio || 2,
        scrollX: 0,
        scrollY: 0,
        windowWidth: tableEl.scrollWidth,
        windowHeight: tableEl.scrollHeight
      }).then(canvas => {
        // Restore original styles
        this.renderer.setStyle(tableWrapperEl, 'overflow', originalOverflow);
        this.renderer.setStyle(tableWrapperEl, 'width', originalWidth);
        tableWrapperEl.scrollLeft = originalScrollLeft;

        const link = document.createElement('a');
        link.download = 'billiard-scoreboard.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch(() => {
        // Restore styles even if error
        this.renderer.setStyle(tableWrapperEl, 'overflow', originalOverflow);
        this.renderer.setStyle(tableWrapperEl, 'width', originalWidth);
        tableWrapperEl.scrollLeft = originalScrollLeft;
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
        // Ensure result.scores is padded for new players
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

import { Component, OnDestroy, OnInit, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { AddGameDialogComponent } from '../add-game-dialog/add-game-dialog.component';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';

@Component({
  standalone: true,
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatDialogModule, CommonModule],
})
export class BoardComponent implements OnInit, OnDestroy {
  gameState!: GameState;
  displayedColumns: string[] = [];
  footerAndDisplayedColumns: string[] = [];
  totalScores: number[] = [];
  private sub!: Subscription;

  @ViewChild('tableWrapper', { static: false }) tableWrapper!: ElementRef<HTMLDivElement>;

  constructor(
    private gameService: GameService,
    private dialog: MatDialog,
    private router: Router,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.sub = this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
      this.displayedColumns = state.players.map(p => p.name);
      this.footerAndDisplayedColumns = ['sumLabel', ...this.displayedColumns];
      this.calculateTotals();
    });
  }

  openAddGameDialog(): void {
    this.dialog.open(AddGameDialogComponent, {
      width: '400px'
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
        result.scores.forEach((score, idx) => {
          totals[idx] += score;
        });
      }
    }
    this.totalScores = totals;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

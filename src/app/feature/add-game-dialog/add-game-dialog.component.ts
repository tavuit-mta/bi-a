// Getter to return losers as FormGroup for template type safety
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { GameResult } from '../../models/game-result.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  standalone: true,
  selector: 'app-add-game-dialog',
  templateUrl: './add-game-dialog.component.html',
  styleUrls: ['./add-game-dialog.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatRadioModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule
  ]
})
export class AddGameDialogComponent implements OnInit {
  form!: FormGroup;
  gameState!: GameState;

  // Getter to return losers as FormGroup for template type safety
  get losersForm(): FormGroup {
    return this.form.get('losers') as FormGroup;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddGameDialogComponent>,
    private gameService: GameService
  ) {}

  ngOnInit(): void {
    this.gameService.gameState$.subscribe(state => {
      this.gameState = state;

      this.form = this.fb.group({
        winner: [null, Validators.required],
        losers: this.fb.group({})
      });

      state.players.forEach(player => {
        (this.form.get('losers') as FormGroup).addControl(
          player.id.toString(),
          new FormControl(null)
        );
      });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const winnerId = this.form.value.winner;
    const losersGroup = this.form.value.losers;

    const scores = this.gameState.players.map(p => 0);

    let totalLoserPoints = 0;

    this.gameState.players.forEach(p => {
      if (p.id !== winnerId) {
        const val = Number(losersGroup[p.id]);
        scores[p.id] = val;
        totalLoserPoints += 0 - val;
      }
    });

    scores[winnerId] = totalLoserPoints;
    console.log('Scores:', scores);
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    if (sum !== 0) {
      alert('Tổng điểm tất cả người chơi phải bằng 0.');
      return;
    }

    const result: GameResult = {
      scores
    };

    this.gameService.addGameResult(result);
    this.dialogRef.close();
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

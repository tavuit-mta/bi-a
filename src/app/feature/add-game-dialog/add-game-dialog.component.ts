// Getter to return losers as FormGroup for template type safety
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule, FormsModule, FormArray, AbstractControl } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { GameResult } from '../../models/game-result.model';
import { Player } from '../../models/player.model';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';

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
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule
  ]
})
export class AddGameDialogComponent implements OnInit {
  form!: FormGroup;
  gameState!: GameState;
  totalPoints: number[] = [];
  sortedPlayerIndexes: number[] = [];
  players: Player[] = [];

  get losersForm(): FormGroup {
    return this.form.get('losers') as FormGroup;
  }

  get extendedArray(): FormArray {
    return this.form.get('extended') as FormArray;
  }

  extendedForm(i: number): FormGroup {
    return this.extendedArray.at(i) as FormGroup;
  }

  get remainingTilesArray(): FormArray {
    return this.form.get('remainingTiles') as FormArray;
  }

  remainingForm(i: number): FormControl {
    return this.remainingTilesArray.at(i) as FormControl;
  }

  get nPlayers(): number {
    return this.players.length;
  }

  penaltyControl(control: AbstractControl, type: 'selected' | 'amount'): FormControl {
    return (control.get(type) as FormControl);
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddGameDialogComponent>,
    private gameService: GameService
  ) {}

  ngOnInit(): void {
    this.gameService.gameState$.subscribe(state => {
      this.gameState = state;
      this.players = state.players.map(p => ({ ...p }));
      this.rebuildForm();
    });
  }

  private rebuildForm(): void {
    this.form = this.fb.group({
      winner: [null, Validators.required],
      losers: this.fb.group({}),
      extended: this.fb.array([]),
      remainingTiles: this.fb.array([])
    });

    this.players.forEach((player, idx) => {
      (this.form.get('losers') as FormGroup).addControl(
        player.id.toString(),
        new FormControl({ value: 0, disabled: false })
      );
      (this.form.get('extended') as FormArray).push(
        this.fb.group({
          commonPoints: [null],
          penaltyPayers: this.fb.array(
            this.players.map((p, j) =>
              this.fb.group({
                id: p.id,
                selected: [false],
                amount: [null]
              })
            )
          )
        })
      );
      (this.form.get('remainingTiles') as FormArray).push(
        new FormControl(0)
      );
    });

    this.sortedPlayerIndexes = this.players.map((_, idx) => idx);

    this.form.get('winner')!.valueChanges.subscribe((winnerId) => {
      this.updateWinnerInput(winnerId);
      this.sortPlayersByWinner(winnerId);
      this.recalculateAllScores();
    });

    this.losersForm.valueChanges.subscribe(() => {
      this.recalculateAllScores();
    });

    this.extendedArray.valueChanges.subscribe(() => {
      this.recalculateAllScores();
    });

    this.remainingTilesArray.valueChanges.subscribe(() => {
      this.recalculateAllScores();
    });

    this.recalculateAllScores();
  }

  private updateWinnerInput(winnerId: number): void {
    this.remainingTilesArray.controls.forEach((ctrl, idx) => {
      ctrl.setValue(0, { emitEvent: false });
      if (this.players[idx].id === winnerId) {
        ctrl.disable({ emitEvent: false });
      } else {
        ctrl.enable({ emitEvent: false });
      }
    });
  }

  private sortPlayersByWinner(winnerId: number): void {
    if (!this.players) return;
    const winnerIdx = this.players.findIndex(p => p.id === winnerId);
    if (winnerIdx === -1) {
      this.sortedPlayerIndexes = this.players.map((_, idx) => idx);
      return;
    }
    this.sortedPlayerIndexes = [
      winnerIdx,
      ...this.players.map((_, idx) => idx).filter(idx => idx !== winnerIdx)
    ];
  }

  private recalculateAllScores(): void {
    if (!this.players) return;
    const n = this.nPlayers;
    let scores = this.players.map(() => 0);

    this.extendedArray.controls.forEach((ctrl, idx) => {
      const common = Number(ctrl.get('commonPoints')?.value);
      if (!isNaN(common) && common > 0) {
        scores[idx] += common * (n - 1);
        this.players.forEach((p, j) => {
          if (j !== idx) {
            scores[j] -= common;
          }
        });
      }
      const receiverIdx = idx;
      const payersArr = ctrl.get('penaltyPayers') as FormArray;
      let totalPenalty = 0;
      payersArr.controls.forEach((payerCtrl: AbstractControl, payerIdx: number) => {
        const amount = Number(payerCtrl.get('amount')?.value);
        if (
          !isNaN(amount) && amount > 0 &&
          payerIdx !== receiverIdx
        ) {
          scores[payerIdx] -= amount * (n - 1);
          totalPenalty += amount * (n - 1);
        }
      });
      scores[receiverIdx] += totalPenalty;
    });

    this.totalPoints = scores.map((score, idx) => {
      const tiles = Number(this.remainingTilesArray.at(idx).value) || 0;
      return score - tiles;
    });

    const winnerId = this.form.value.winner;
    if (winnerId !== null && winnerId !== undefined) {
      const winnerIndex = this.players.findIndex(p => p.id === winnerId);
      if (winnerIndex !== -1) {
        this.totalPoints[winnerIndex] += this.remainingTilesArray.value.reduce((acc: number, cur: number) => acc + (Number(cur) || 0), 0);
      }
    }
  }

  getPenaltyPayersFormArray(i: number): FormArray {
    return (this.extendedArray.at(i).get('penaltyPayers') as FormArray);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const scores = this.totalPoints;
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

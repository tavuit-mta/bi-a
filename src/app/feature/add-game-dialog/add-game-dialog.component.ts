// Getter to return losers as FormGroup for template type safety
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { GameService } from '../../core/services/game.service';
import { GameState } from '../../models/game-state.model';
import { GameResult } from '../../models/game-result.model';
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

  get losersForm(): FormGroup {
    return this.form.get('losers') as FormGroup;
  }

  get extendedArray(): FormArray {
    return this.form.get('extended') as FormArray;
  }

  get nPlayers(): number {
    return this.gameState?.players?.length || 0;
  }

  extendedGroup(i: number): FormGroup {
    return this.extendedArray.at(i) as FormGroup;
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
        losers: this.fb.group({}),
        extended: this.fb.array([])
      });

      // Add controls for each player
      state.players.forEach(player => {
        (this.form.get('losers') as FormGroup).addControl(
          player.id.toString(),
          new FormControl({ value: 0, disabled: false })
        );
        (this.form.get('extended') as FormArray).push(
          this.fb.group({
            hasCommon: [false],
            commonPoints: [null],
            hasPenalty: [false],
            penaltyPayers: [[]], // array of player ids
            penaltyPoints: [null]
          })
        );
      });

      this.form.get('winner')!.valueChanges.subscribe(() => {
        this.updateWinnerInput();
        this.recalculateAllScores();
      });

      this.losersForm.valueChanges.subscribe(() => {
        this.recalculateAllScores();
      });

      this.extendedArray.valueChanges.subscribe(() => {
        this.recalculateAllScores();
      });

      // Clear extended fields when checkboxes are unchecked
      this.extendedArray.controls.forEach((ctrl, idx) => {
        ctrl.get('hasCommon')?.valueChanges.subscribe((checked: boolean) => {
          if (!checked) {
            ctrl.patchValue({ commonPoints: null }, { emitEvent: false });
            this.recalculateAllScores();
          }
        });
        ctrl.get('hasPenalty')?.valueChanges.subscribe((checked: boolean) => {
          if (!checked) {
            ctrl.patchValue({ penaltyPayers: [], penaltyPoints: null }, { emitEvent: false });
            this.recalculateAllScores();
          }
        });
      });
    });
  }

  private updateWinnerInput(): void {
    const winnerId = this.form.value.winner;
    if (winnerId === null || winnerId === undefined) return;
    this.gameState.players.forEach(player => {
      const control = this.losersForm.get(player.id.toString());
      if (player.id === winnerId) {
        control?.disable({ emitEvent: false });
      } else {
        control?.enable({ emitEvent: false });
      }
    });
  }

  private recalculateAllScores(): void {
    if (!this.gameState) return;
    const n = this.nPlayers;
    // Start with base scores (user input)
    let scores = this.gameState.players.map((p, idx) => {
      const ctrl = this.losersForm.get(p.id.toString());
      return Number(ctrl?.value) || 0;
    });

    // Reset all scores to 0 before applying extended logic
    scores = scores.map(() => 0);

    // Apply all common points and penalty points
    this.extendedArray.controls.forEach((ctrl, idx) => {
      // Common Points
      if (ctrl.get('hasCommon')?.value) {
        const common = Number(ctrl.get('commonPoints')?.value);
        if (!isNaN(common) && common > 0) {
          // The current player gains common * (n-1)
          scores[idx] += common * (n - 1);
          // All other players lose common
          this.gameState.players.forEach((p, j) => {
            if (j !== idx) {
              scores[j] -= common;
            }
          });
        }
      }
      // Penalty Points
      if (ctrl.get('hasPenalty')?.value) {
        const receiverIdx = idx;
        const payers: number[] = ctrl.get('penaltyPayers')?.value || [];
        const penalty = Number(ctrl.get('penaltyPoints')?.value);
        if (
          Array.isArray(payers) && payers.length > 0 &&
          !isNaN(penalty) && penalty > 0
        ) {
          // Each payer loses penalty * (n-1)
          // Receiver gains penalty * (number of payers)
          payers.forEach(payerId => {
            const payerIdx = this.gameState.players.findIndex(p => p.id === payerId);
            if (payerIdx !== -1) {
              scores[payerIdx] -= penalty * (n - 1);
            }
          });
          scores[receiverIdx] += penalty * (n - 1) * payers.length;
        }
      }
    });

    // Update the form controls with the calculated scores
    this.gameState.players.forEach((p, idx) => {
      const ctrl = this.losersForm.get(p.id.toString());
      if (ctrl && ctrl.value !== scores[idx]) {
        ctrl.setValue(scores[idx], { emitEvent: false });
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const losersGroup = this.losersForm.getRawValue();
    const scores = this.gameState.players.map(p => Number(losersGroup[p.id]) || 0);

    // Validation: sum must be zero
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

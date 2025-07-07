// Getter to return losers as FormGroup for template type safety
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, ReactiveFormsModule, FormsModule, FormArray, AbstractControl } from '@angular/forms';
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

interface PenaltyPayer {
  id: number;
  selected: boolean;
  amount: number | null;
}

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

  getPenaltyPayersFormArray(i: number): FormArray {
    return (this.extendedArray.at(i).get('penaltyPayers') as FormArray);
  }

  getFormControl(control: AbstractControl, type: 'amount' | 'selected'): FormControl {
    return control.get(type) as FormControl;
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
      state.players.forEach((player, idx) => {
        (this.form.get('losers') as FormGroup).addControl(
          player.id.toString(),
          new FormControl({ value: 0, disabled: false })
        );
        // Penalty payers: one FormGroup per other player
        const penaltyPayersArray = this.fb.array(
          state.players.map((p, j) =>
            this.fb.group({
              id: p.id,
              selected: [false],
              amount: [null]
            })
          )
        );
        (this.form.get('extended') as FormArray).push(
          this.fb.group({
            hasCommon: [false],
            commonPoints: [null],
            hasPenalty: [false],
            penaltyPayers: penaltyPayersArray
          })
        );
      });

      this.form.get('winner')!.valueChanges.subscribe(() => {
        // this.updateWinnerInput();
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
            const payersArr = ctrl.get('penaltyPayers') as FormArray;
            payersArr.controls.forEach((payerCtrl: AbstractControl) => {
              (payerCtrl as FormGroup).patchValue({ selected: false, amount: null }, { emitEvent: false });
            });
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
      console.log(`Updating control for player ${player.id}, winnerId: ${winnerId}`);
      
      const control = this.losersForm.get(player.id.toString());
      if (player.id === winnerId) {
        control?.disable();
      } else {
        control?.enable();
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
        const payersArr = ctrl.get('penaltyPayers') as FormArray;
        let totalPenalty = 0;
        payersArr.controls.forEach((payerCtrl: AbstractControl, payerIdx: number) => {
          const selected = payerCtrl.get('selected')?.value;
          const amount = Number(payerCtrl.get('amount')?.value);
          if (
            selected &&
            !isNaN(amount) && amount > 0 &&
            payerIdx !== receiverIdx // cannot pay to self
          ) {
            // Each payer loses their amount * (n-1)
            scores[payerIdx] -= amount * (n - 1);
            totalPenalty += amount * (n - 1);
          }
        });
        // Receiver gains sum of all penalty points paid
        scores[receiverIdx] += totalPenalty;
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

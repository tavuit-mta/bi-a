// Getter to return losers as FormGroup for template type safety
import { Component, OnInit, Inject, signal, Signal, viewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { GameService } from '../../core/services/game.service';
import { GameState, ModalMode } from '../../models/game-state.model';
import { PlayerModel } from '../../models/player.model';
import { GameResult, PenaltyDetail } from '../../models/game-result.model';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { NumberPatternClearDirective } from '../../shared/number-pattern-clear.directive';
import { AppService } from '../../app.service';


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
    MatCheckboxModule,
    MatExpansionModule,
    NumberPatternClearDirective
  ]
})
export class AddGameDialogComponent implements OnInit {
  private _players: PlayerModel[] = [];

  form!: FormGroup;
  gameState!: GameState;
  totalPoints: number[] = [];
  sortedPlayerIndexes: number[] = [];
  isViewMode = false;
  isEditMode = false;
  editRowIndex: number | null = null;
  panelOpenState = signal(-1);
  accordion: Signal<MatAccordion> = viewChild.required(MatAccordion);
  modelMode: ModalMode = ModalMode.Add; // Default to Add mode
  ModelMode = ModalMode;
  isServerMode = false; // Flag to indicate if running in server mode

  get players(): PlayerModel[] {
    return this._players;
  }

  set players(value: PlayerModel[]) {
    this._players = value.filter(p => p.active);
  }

  get nPlayers(): number {
    return this.players.length;
  }

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

  penaltyControl(control: AbstractControl, type: 'selected' | 'amount'): FormControl {
    return (control.get(type) as FormControl);
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddGameDialogComponent>,
    private gameService: GameService,
    private appService: AppService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isServerMode = this.appService.isServer;
  }

  ngOnInit(): void {
    this.modelMode = this.data.mode;
    this.handleForm();
  }

  private handleForm(): void {
    if (this.data.mode === ModalMode.View) {
      this.isViewMode = true;
      this.isEditMode = false;
      this.editRowIndex = this.data.rowIndex;
      this.players = this.data.players.map((p: PlayerModel) => ({ ...p }));
      this.rebuildForm(this.data.result);
    } 

    if (this.data.mode === ModalMode.Edit) {
      this.isEditMode = true;
      this.isViewMode = false;
      this.editRowIndex = this.data.rowIndex;
      this.players = this.data.players.map((p: PlayerModel) => ({ ...p }));
      this.rebuildForm(this.data.result);
    }
    
    this.gameService.gameState$.subscribe(state => {
      if (this.data.mode === ModalMode.Add) {
        this.isEditMode = true;
        this.isViewMode = false;
        this.players = state.players.map(p => ({ ...p } as PlayerModel));
        this.rebuildForm();
      }
    });
  }

  private rebuildForm(existingResult?: GameResult): void {
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
        new FormControl(0, Validators.min(0))
      );
    });

    this.sortedPlayerIndexes = this.players.map((_, idx) => idx);
    
    if (this.modelMode === ModalMode.View) {
      this.form.disable({ emitEvent: false });
    }
    if (this.modelMode === ModalMode.Edit) {
      this.form.enable({ emitEvent: false });
    }

    this.cdr.detectChanges();

    if (existingResult) {
      // Pre-fill winner
      if (existingResult.winnerId !== undefined && existingResult.winnerId !== null) {
        this.form.get('winner')?.setValue(existingResult.winnerId);
        this.sortPlayersByWinner(existingResult.winnerId);
      }
      // Pre-fill scores as remaining tiles (if you use this logic)
      if (existingResult.scores) {
        existingResult.scores.forEach((score, idx) => {
          if (this.remainingTilesArray.at(idx)) {
            this.remainingTilesArray.at(idx).setValue(score, { emitEvent: false });
          }
          if (idx === existingResult.winnerId) {
            this.remainingTilesArray.at(idx)!.disable({ emitEvent: false });
          }
        });
      }
      // Pre-fill commonPoints
      if (existingResult.commonPoints) {
        existingResult.commonPoints.forEach((cp, idx) => {
          if (this.extendedArray.at(idx)) {
            this.extendedArray.at(idx).get('commonPoints')?.setValue(cp, { emitEvent: false });
          }
        });
      }
      // Pre-fill penalties
      if (existingResult.penalties) {
        existingResult.penalties.forEach(penalty => {
          const receiverIdx = this.players.findIndex(p => p.id === penalty.receiverId);
          if (receiverIdx !== -1) {
            const penaltyPayersArr = this.getPenaltyPayersFormArray(receiverIdx);
            const payerIdx = this.players.findIndex(p => p.id === penalty.payerId);
            if (payerIdx !== -1) {
              penaltyPayersArr.at(payerIdx).get('amount')?.setValue(penalty.amount, { emitEvent: false });
            }
          }
        });
      }

      // Pre-fill remaining tiles
      if (existingResult.remainingPoints) {
        existingResult.remainingPoints.forEach((points, idx) => {
          if (this.remainingTilesArray.at(idx)) {
            this.remainingTilesArray.at(idx).setValue(points, { emitEvent: false });
          }
        });
      }
    }
    
    this.form.get('winner')!.valueChanges.subscribe((winnerId) => {
      this.form.reset({ winner: winnerId }, { emitEvent: false });
      this.recalculateAllScores();
      this.cdr.detectChanges();
      this.updateWinnerInput(winnerId);
      this.sortPlayersByWinner(winnerId);
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
    this.cdr.detectChanges();
  }

  private updateWinnerInput(winnerId: number): void {
    this.remainingTilesArray.controls.forEach((ctrl, idx) => {
      if (this.players[idx].id === winnerId) {
        ctrl.disable({ emitEvent: false });
        ctrl.setValue(0, { emitEvent: false });
      } else {
        ctrl.enable({ emitEvent: false });
        ctrl.setValue(null, { emitEvent: false });
        ctrl.addValidators([Validators.required, Validators.min(1)]);
        ctrl.updateValueAndValidity({ emitEvent: false });
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

    if (this.data?.mode === ModalMode.Add) {
      this.panelOpenState.set(this.sortedPlayerIndexes[0]); 
    } else {
      this.panelOpenState.set(-1);
    }
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
    if (this.modelMode === ModalMode.View) {
      this.modelMode = ModalMode.Edit;
      this.isViewMode = false;
      this.isEditMode = true;
      this.cdr.detectChanges();
      this.handleForm();
      return;
    }
    if (!confirm('Bạn chắc chắn về kết quả vừa nhâp?')) {
      return
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('winner')?.invalid) {
        alert('Vui lòng chọn người chiến thắng.');
      }
      if (this.remainingTilesArray.invalid) {
        alert('Vui lòng nhập số lá còn lại cho tất cả người chơi.');
      }
      return;
    }

    const scores = this.totalPoints;
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    if (sum !== 0) {
      alert('Tổng điểm tất cả người chơi phải bằng 0.');
      return;
    }

    // Gather commonPoints
    const commonPoints: number[] = this.extendedArray.controls.map(ctrl =>
      Number(ctrl.get('commonPoints')?.value) || 0
    );
    const remainingPoints: number[] = this.remainingTilesArray.controls.map(ctrl =>
      Number(ctrl.value) || 0
    );

    // Gather penalties
    const penalties: PenaltyDetail[] = [];
    this.extendedArray.controls.forEach((ctrl, receiverIdx) => {
      const payersArr = ctrl.get('penaltyPayers') as FormArray;
      payersArr.controls.forEach((payerCtrl: AbstractControl, payerIdx: number) => {
        const amount = Number(payerCtrl.get('amount')?.value);
        if (!isNaN(amount) && amount > 0 && payerIdx !== receiverIdx) {
          penalties.push({
            payerId: this.players[payerIdx].id,
            amount,
            receiverId: this.players[receiverIdx].id
          });
        }
      });
    });

    const result: GameResult = {
      nPlayers: this.nPlayers,
      players: this.players.map(p => ({ id: p.id, name: p.name, profileId: p.profileId, active: p.active })),
      winnerId: this.form.value.winner,
      scores,
      commonPoints,
      penalties,
      remainingPoints
    };

    if (this.modelMode === ModalMode.Edit && this.editRowIndex !== null) {
      this.gameService.updateGameResult(this.editRowIndex, result);
    } 
    if (this.modelMode === ModalMode.Add) {
      this.gameService.addGameResult(result);
    }
    this.dialogRef.close();
  }

  isError(index: number): boolean {
    const form = this.remainingForm(index);
    return form.invalid && (form.dirty || form.touched);
  }

  togglePanel(index: number): void {
    this.panelOpenState.set(index)
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

// Getter to return losers as FormGroup for template type safety
import { Component, OnInit, Inject, signal, Signal, viewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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
import { Subject, takeUntil } from 'rxjs';
import { NgxCurrencyDirective } from 'ngx-currency';
import { MatListModule } from '@angular/material/list';
import { BillTable } from '../../models/game-setting.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  standalone: true,
  selector: 'app-add-bill',
  templateUrl: './add-bill.component.html',
  styleUrl: './add-bill.component.scss',
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
    NumberPatternClearDirective,
    NgxCurrencyDirective,
    MatListModule
  ]
})
export class AddBillComponent implements OnInit, OnDestroy {
  private _players: PlayerModel[] = [];
  onDestroy$: Subject<void> = new Subject<void>();
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
    return this.form.get('debtors')?.value.length || 1;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddBillComponent>,
    private gameService: GameService,
    private appService: AppService,
  ) {
    this.appService.isServer().then(isServer => {
      this.isServerMode = isServer;
      console.log('Is server mode:', this.isServerMode);
    }).catch(err => {
      console.error('Error checking server mode:', err);
      this.isServerMode = false;
    });
  }

  ngOnInit(): void {
    this.handleForm();
  }

  private handleForm(): void {
    this.gameService.gameState$
      .pipe(
        takeUntil(this.onDestroy$),
      )
      .subscribe(state => {
        this.players = state.players.map(p => ({ ...p } as PlayerModel));
        this.rebuildForm();
      });
  }

  private rebuildForm(existingResult?: GameResult): void {
    this.form = this.fb.group({
      payer: [null, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      debtors: [null, Validators.required]
    });

    this.form.get('payer')!.valueChanges.subscribe((payerId) => {
      this.form.reset({ payer: payerId }, { emitEvent: false });
      this.form.get('debtors')!.setValue(this.players.map(p => p.index), { emitEvent: false });
    });
  }

  save(): void {
    if (!confirm('Bạn chắc chắn về kết quả vừa nhâp?')) {
      return
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('payer')?.invalid) {
        alert('Vui lòng chọn người thanh toán.');
        return;
      }

      if (this.form.get('amount')?.invalid) {
        alert('Vui lòng nhập số tiền.');
        return;
      }

      return;
    }

    const getDebtorID = (debtor: number) => this.players.find(p => p.index === debtor)?.profileId || '';

    const formValue = this.form.value;
    const payerID = this.players.find(p => p.index === formValue.payer)?.profileId || '';
    const transaction: BillTable[] = formValue.debtors.map((debtor: number) => (
      new BillTable({
        debtor: getDebtorID(debtor),
        payer: payerID,
        amount: Math.round(formValue.amount / this.nPlayers)
      })
    ));


    this.appService.startLoading();
    const transactionId = [payerID, uuidv4()].join('-');

    this.gameService.pushBillTable(transactionId, transaction).then(() => {
      this.appService.stopLoading();
      this.dialogRef.close();
    }).finally(() => {
      this.appService.stopLoading();
    });
  }

  togglePanel(index: number): void {
    this.panelOpenState.set(index)
  }

  cancel(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

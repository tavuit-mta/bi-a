import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';


@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule
  ],
  templateUrl: './transaction.component.html',
  styleUrl: './transaction.component.scss'
})
export class TransactionComponent {
  transactions: string[];
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { transactions: string[] }
  ) {
    this.transactions = data.transactions;
  }
}

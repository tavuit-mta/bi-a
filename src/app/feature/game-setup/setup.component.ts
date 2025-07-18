import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../../core/services/game.service';
import { Player } from '../../models/player.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class SetupComponent {

  playerForm: ReturnType<FormBuilder['group']>;

  constructor(
    private fb: FormBuilder,
    private gameService: GameService,
    private router: Router
  ) {
    this.playerForm = this.fb.group({
      players: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required)
      ])
    });
    this.gameService.gameState$.subscribe(state => {
      if (state.players.length > 0) {
        this.router.navigate(['/board']);
      }
    });
  }

  get players() {
    return this.playerForm.get('players') as FormArray;
  }

  addPlayer(): void {
    this.players.push(this.fb.control('', Validators.required));
  }

  removePlayer(index: number): void {
    if (this.players.length > 2) {
      this.players.removeAt(index);
    }
  }

  submit(): void {
    if (this.playerForm.invalid) {
      this.playerForm.markAllAsTouched();
      return;
    }

    const playerNames: string[] = this.players.value.filter((name: string) => !!name);

    const players: Player[] = playerNames.map((name, idx) => ({
      id: idx,
      name
    }));

    this.gameService.setPlayers(players);
    this.router.navigate(['/board']);
  }
}

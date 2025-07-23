import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../../core/services/game.service';
import { Player, PlayerModel } from '../../models/player.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../models/profile.model';
import { combineLatest } from 'rxjs';
import { AppService } from '../../app.service';
import { GameState } from '../../models/game-state.model';

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
export class SetupComponent implements OnInit {

  playerForm: ReturnType<FormBuilder['group']>;
  isServerMode = false; // Flag to indicate if running in server mode
  profile!: Profile;
  gameState!: GameState;

  constructor(
    private fb: FormBuilder,
    private appService: AppService,
    private gameService: GameService,
    private profileService: ProfileService,
    private router: Router
  ) {
    this.playerForm = this.fb.group({
      players: this.fb.array([])
    });
    this.isServerMode = this.appService.isServer;
    combineLatest([
      this.gameService.gameState$,
      this.profileService.getProfile()
    ]).subscribe(([gameState, profile]) => {
      this.profile = profile;
      this.gameState = gameState;

      if (!profile || !profile.isComplete()) {
        this.router.navigate(['/profile']);
      } else if (gameState.players.some(p => p.profileId === profile.profileId)) {
        this.router.navigate(['/board']);
      } else if (profile && profile.username) {
        this.addPlayer(profile.username);
      }
    });
  }

  ngOnInit(): void {
    this.profileService.loadProfile();
  }

  get players() {
    return this.playerForm.get('players') as FormArray;
  }

  addPlayer(playerName: string): void {
    this.players.push(this.fb.control({ value: playerName, disabled: true }));
  }

  removePlayer(index: number): void {
    if (this.players.length > 2) {
      this.players.removeAt(index);
    }
  }

  submit(): void {
    if (this.playerForm.invalid || !this.profile) {
      this.playerForm.markAllAsTouched();
      return;
    }
    const playerNames: string[] = this.players.value.filter((name: string) => !!name);
    const newId = Math.max(0, ...this.gameState.players.map(p => p.id)) + 1;
    const players: PlayerModel[] = playerNames.map((name) => new PlayerModel({
      id: newId,
      name,
      profileId: this.profile.profileId,
      avatar: this.profile.avatarUrl || Profile.generateRandomAvatar(),
    }));

    if (this.isServerMode) {
      this.gameService.setPlayers(players);
    } else {
      this.gameService.addPlayer(players[0]);
      this.gameService.addPlayerToResults(players[0]);
    }

    this.router.navigate(['/board']);
  }

  editProfile(): void {
    this.router.navigate(['/profile'], { queryParams: { fromSetup: true } });
  }

  view(): void {
    this.router.navigate(['/board']);
  }
}

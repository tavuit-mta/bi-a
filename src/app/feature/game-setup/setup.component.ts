import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { combineLatest, distinct, Subject, takeUntil } from 'rxjs';
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
export class SetupComponent implements OnInit, OnDestroy {
  onDestroy$: Subject<void> = new Subject<void>();
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
      player: new FormControl({value: null, disabled: true}, [Validators.required]),
    });
    this.isServerMode = this.appService.isServer;
    combineLatest([
      this.gameService.gameState$,
      this.profileService.getProfile()
    ])
      .pipe(
        takeUntil(this.onDestroy$),
        distinct(([gameState, profile]) => profile.profileId)
      )
      .subscribe(([gameState, profile]) => {
        this.profile = profile;
        this.gameState = gameState;
        console.log('Game state:', gameState);
        console.log('Profile:', profile);
        
        if (!profile || !profile.isComplete()) {
          this.router.navigate(['/profile']);
        } else if (gameState.players.some(p => p.profileId === profile.profileId)) {
          const currentPlayer = gameState.players.find(p => p.profileId === profile.profileId);
          if (currentPlayer) {
            currentPlayer.activePlayer();
            this.gameService.putPlayer(currentPlayer);
            this.router.navigate(['/board']);
          }
        } else if (profile && profile.username) {
          this.addPlayer(profile.username);
        }
      });
  }

  ngOnInit(): void {
    this.profileService.loadProfile();
  }

  get player() {
    return this.playerForm.get('player') as FormControl;
  }

  addPlayer(playerName: string): void {
    this.player.setValue(playerName);
  }

  submit(): void {
    if (this.playerForm.invalid || !this.profile) {
      this.playerForm.markAllAsTouched();
      return;
    }
    const playerName: string = this.player.value?.trim();
    const player: PlayerModel = new PlayerModel({
      id: 0,
      name: playerName,
      profileId: this.profile.profileId,
      avatar: this.profile.avatarUrl || Profile.generateRandomAvatar(),
    })

    if (this.isServerMode) {
      this.gameService.setPlayers([player]);
    } else {
      const newId = Math.max(0, ...this.gameState.players.map(p => p.id)) + 1;
      player.id = newId;
      this.gameService.addPlayer(player);
      this.gameService.addPlayerToResults(player);
    }

    this.router.navigate(['/board']);
  }

  editProfile(): void {
    this.router.navigate(['/profile'], { queryParams: { fromSetup: true } });
  }

  view(): void {
    this.router.navigate(['/board']);
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    console.log('SetupComponent destroyed');
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

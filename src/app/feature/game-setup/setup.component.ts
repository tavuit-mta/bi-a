import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../../core/services/game.service';
import { PlayerModel } from '../../models/player.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../models/profile.model';
import { combineLatest, distinct, distinctUntilKeyChanged, Observable, Subject, take, takeUntil } from 'rxjs';
import { AppService } from '../../app.service';
import { GameState } from '../../models/game-state.model';
import { NgxCurrencyDirective } from "ngx-currency";
import { MatDividerModule } from '@angular/material/divider';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


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
    MatButtonModule,
    NgxCurrencyDirective,
    MatDividerModule
  ]
})
export class SetupComponent implements OnInit, OnDestroy {
  onDestroy$: Subject<void> = new Subject<void>();
  playerForm: ReturnType<FormBuilder['group']>;
  isServerMode = false; // Flag to indicate if running in server mode
  profile!: Profile;
  gameState!: GameState;

  get gameUnit(): Observable<number | null> {
    return this.gameService.unit$;
  }

  set gameUnit(value: number) {
    this.gameService.setGameUnit(value);
  }

  constructor(
    private fb: FormBuilder,
    private appService: AppService,
    private gameService: GameService,
    private profileService: ProfileService,
    private router: Router,
    private dialogRef: MatDialogRef<SetupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { joinGame: boolean } = { joinGame: false },
  ) {
    this.playerForm = this.fb.group({
      player: new FormControl(null, [Validators.required]),
    });
    this.appService.isServer().then(isServer => {
      this.isServerMode = isServer;
      console.log('Is server mode:', this.isServerMode);
    }).catch(err => {
      console.error('Error checking server mode:', err);
      this.isServerMode = false;
    });
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
        if (gameState.players.some(p => p.profileId === profile.profileId) && !this.isServerMode) {
          const currentPlayer = gameState.players.find(p => p.profileId === profile.profileId);
          if (currentPlayer) {
            currentPlayer.activePlayer();
            this.gameService.putPlayer(currentPlayer);
            this.appService.startLoading();
            setTimeout(() => {
              this.router.navigate(['/board']);
              this.dialogRef.close();
              this.appService.stopLoading();
            }, 2000);
          }
        } else if (profile && profile.username) {
          this.addPlayer(profile.username);
        }
      });

    this.playerForm.valueChanges.pipe(
      takeUntil(this.onDestroy$),
      distinctUntilKeyChanged('player')
    ).subscribe(value => {
      const { player } = value;
      const profileData: Profile = new Profile(player);
      this.profileService.updateProfile(profileData);
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
    this.appService.startLoading();
    const playerName: string = this.player.value?.trim();
    const player: PlayerModel = new PlayerModel({
      index: 0,
      name: playerName,
      profileId: this.profile.profileId,
      avatar: this.profile.avatarUrl || Profile.generateRandomAvatar(),
    })

    if (this.isServerMode) {
      this.gameService.setPlayers([player]);
    } else {
      const newId = Math.max(0, ...this.gameState.players.map(p => p.index)) + 1;
      player.index = newId;
      this.gameService.addPlayer(player);
      this.gameService.addPlayerToResults(player);
    }
    if (this.data.joinGame) {
      setTimeout(() => {
        this.router.navigate(['/board']);
        this.dialogRef.close();
        this.appService.stopLoading();
      }, 2000);
    } else {
      this.gameService.updateGameSetting().then(() => {
        setTimeout(() => {
          this.router.navigate(['/board']);
          this.dialogRef.close();
          this.appService.stopLoading();
        }, 2000);
      });
    }
  }

  ngOnDestroy(): void {
    console.log('SetupComponent destroyed');
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}

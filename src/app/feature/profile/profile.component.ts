import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../models/profile.model';
import { NumberPatternClearDirective } from '../../shared/number-pattern-clear.directive';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    NumberPatternClearDirective
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private onDestroy$: Subject<void> = new Subject<void>();
  profileForm!: FormGroup;
  loading = true;
  editFromSetup = false;

  constructor(private profileService: ProfileService, private fb: FormBuilder, private router: Router, private _activeRouter: ActivatedRoute) {
    this._activeRouter.queryParams.subscribe(params => {
      if (params['fromSetup']) {
        console.log('Navigated from setup, loading profile...');
        this.editFromSetup = true;
      }
    });
  }

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      username: ['', Validators.required],
      bankAccount: ['', [Validators.required]],
      deviceId: [{ value: '', disabled: true }],
      profileId: [{ value: '', disabled: true }]
    });

    this.profileService.getProfile()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((profile: Profile) => {
        if (profile) {
          this.profileForm.patchValue(profile);
        }
        this.loading = false;
      });

    this.profileService.loadProfile();
  }

  saveProfile() {
    console.log('Saving profile:', this.profileForm.value);

    if (this.profileForm.valid) {
      const username = this.profileForm.get('username')?.value;
      const bankAccount = this.profileForm.get('bankAccount')?.value;
      const profileData: Profile = new Profile(username, bankAccount);
      this.profileService.updateProfile(profileData);
      console.log('Profile saved:', profileData);
      this.onNavigateRouter();
    } else {
      this.profileForm.markAllAsTouched();
    }
  }

  onNavigateRouter() {
    if (this.editFromSetup) {
      this.router.navigate(['/setup']);
    }
    else {
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

}

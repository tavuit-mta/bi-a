import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ProfileService } from './core/services/profile.service';
import { Profile } from './models/profile.model';
import { CommonModule } from '@angular/common';
import { AppService } from './app.service';
import { BehaviorSubject } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { NetworkStatusService } from './core/services/network-status.service';
import { ENetworkStatus } from './core/enums/network-status.enum';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  isLoading$: BehaviorSubject<boolean>;
  _snackBar = inject(MatSnackBar);
  _snackBarRef: MatSnackBarRef<TextOnlySnackBar> | null = null;

  title = 'BilliardScore';

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private appService: AppService,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private networkStatusService: NetworkStatusService  
  ) {
    this.profileService.getProfile().subscribe((profile: Profile) => {
      profile.saveToLocalStorage();
      this.profileService.setIsCompleteProfile(profile.isComplete());
    });

    this.networkStatusService.onlineStatus().subscribe((status: ENetworkStatus) => {
      if (status === ENetworkStatus.Offline) {
        this.appService.startLoading();
        this._snackBarRef = this._snackBar.open('You are offline. Some features may not be available.'); 
      } else {
        this.appService.stopLoading();
        this._snackBarRef?.dismiss();
      }
    });

    this.isLoading$ = this.appService.isLoading$;

    this.matIconRegistry.addSvgIcon(
      'qr_code', // The name you'll use to reference the icon
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/qr_code.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'trophy', // The name you'll use to reference the icon
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/trophy.svg')
    );
  }
}

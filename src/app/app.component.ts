import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ProfileService } from './core/services/profile.service';
import { Profile } from './models/profile.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'BilliardScore';

  constructor(private router: Router, private profileService: ProfileService) {
    this.profileService.getProfile().subscribe((profile: Profile) => {
      profile.saveToLocalStorage();
      this.profileService.setIsCompleteProfile(profile.isComplete());
    });
  }
}

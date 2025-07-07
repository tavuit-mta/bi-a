import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  imports: [
    MatButtonModule
  ]
})
export class StartComponent {
  constructor(private router: Router) {}

  startGame(): void {
    this.router.navigate(['/setup']);
  }
}

import { Routes } from '@angular/router';
import { BoardComponent } from './feature/game-board/board.component';
import { SetupComponent } from './feature/game-setup/setup.component';
import { StartComponent } from './feature/start/start.component';
import { ProfileComponent } from './feature/profile/profile.component';
import { PolicyComponent } from './feature/policy/policy.component';

export const routes: Routes = [
    { path: '', component: StartComponent },
    // { path: 'setup', component: SetupComponent },
    { path: 'board', component: BoardComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'policy', component: PolicyComponent },
    { path: '**', redirectTo: '' }
];

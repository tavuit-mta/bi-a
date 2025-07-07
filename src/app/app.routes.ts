import { Routes } from '@angular/router';
import { BoardComponent } from './feature/game-board/board.component';
import { SetupComponent } from './feature/game-setup/setup.component';
import { StartComponent } from './feature/start/start.component';

export const routes: Routes = [
    { path: '', component: StartComponent },
    { path: 'setup', component: SetupComponent },
    { path: 'board', component: BoardComponent },
    { path: '**', redirectTo: '' }
];

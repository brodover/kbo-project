import { Routes } from '@angular/router';
import { PlayerStatsComponent } from './components/player-stats/player-stats';

export const routes: Routes = [
  // Default route (homepage)
  { path: '', redirectTo: 'player-stats', pathMatch: 'full' },
  
  // Route for the Pitch Chart
  { path: 'player-stats', component: PlayerStatsComponent },
  
  // Catch-all route for 404s (optional)
  { path: '**', redirectTo: 'player-stats' } 
];
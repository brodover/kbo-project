export class PlayerStats {

}
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerGameStats } from '../../models/player-game-stats';
import { PlayerStatsService } from '../../services/player-stats';

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-stats.html',
  styleUrls: ['./player-stats.css']
})
export class PlayerStatsComponent {
  private playerStatsService = inject(PlayerStatsService);

  // Form fields
  batterId: number = 50500; // Default test ID
  startDate: string = '';
  endDate: string = '';

  // Data state
  stats: PlayerGameStats[] = [];
  loading: boolean = false;
  errorMessage: string = '';

  searchStats() {
    if (!this.batterId) return;

    this.loading = true;
    this.errorMessage = '';

    this.playerStatsService.getPlayerObpStats(this.batterId, this.startDate || undefined, this.endDate || undefined)
      .subscribe({
        next: (data) => {
          this.stats = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching stats', err);
          this.errorMessage = 'Failed to load player stats. Please check the backend.';
          this.loading = false;
        }
      });
  }
}
export class PlayerStats {

}
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerGameStats } from '../../models/player-game-stats';
import { PlayerStatsService } from '../../services/player-stats';

export interface CachedSearchResult {
  playerId: number;
  timeFrame: string;
  obp: number;
  stats: PlayerGameStats[];
}

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-stats.html',
  styleUrls: ['./player-stats.css']
})
export class PlayerStatsComponent {
  private playerStatsService = inject(PlayerStatsService);

  // recent search results
  recentResults: CachedSearchResult[] = [];
  private readonly STORAGE_KEY = 'cached_player_obp_results';
  private readonly MAX_HISTORY = 10;

  // Form fields
  batterId: number = 50500; // Default test ID
  startDate: string = '';
  endDate: string = '';

  // Data state
  stats: PlayerGameStats[] = [];
  loading: boolean = false;
  errorMessage: string = '';

  ngOnInit() {
    this.loadSearchHistory();
  }

  loadSearchHistory() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.recentResults = JSON.parse(saved);
      } catch (e) {
        this.recentResults = [];
      }
    }
  }

  saveSearchResult(playerId: number | number, timeFrame: string, obp: number, stats: PlayerGameStats[]) {
    const newEntry: CachedSearchResult = { playerId, timeFrame, obp, stats };

    // Filter out any exact duplicates for this player and timeframe
    this.recentResults = this.recentResults.filter(
      item => !(item.playerId === playerId && item.timeFrame === timeFrame)
    );

    // Push to the front and cap at 10
    this.recentResults.unshift(newEntry);
    if (this.recentResults.length > 10) {
      this.recentResults = this.recentResults.slice(0, 10);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentResults));
  }

  // When user clicks a history chip, load it directly without hitting the API!
  loadFromHistory(entry: CachedSearchResult) {
    // this.selectedObp = entry.obp;
    // this.stats = entry.stats;
  }

  clearHistory() {
    this.recentResults = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  searchStats() {
    if (!this.batterId) return;

    const timeFrame = this.getTimeFrameString();

    // 1. CHECK LOCAL CACHE FOR A DUPLICATE FIRST
    const cachedMatch = this.recentResults.find(
      item => item.playerId === this.batterId && item.timeFrame === timeFrame
    );

    if (cachedMatch) {
      // Cache Hit! Load instantly without calling the backend
      this.stats = cachedMatch.stats;
      this.loading = false;
      this.errorMessage = '';
      
      // Refresh its position to the front of your history list
      this.saveSearchResult(this.batterId, timeFrame, cachedMatch.obp, cachedMatch.stats);
      return;
    }

    // 2. CACHE MISS - PROCEED WITH API CALL
    this.loading = true;
    this.errorMessage = '';

    this.playerStatsService.getPlayerObpStats(this.batterId, this.startDate || undefined, this.endDate || undefined)
      .subscribe({
        next: (data) => {
          this.stats = data;
          this.loading = false;

          // Calculate OBP locally or extract it from the data first, then save:
          const obp = this.calculateObp(data); 

          // Save to localStorage ONLY after data is safely loaded and available
          this.saveSearchResult(this.batterId, timeFrame, obp, data);
        },
        error: (err) => {
          console.error('Error fetching stats', err);
          this.errorMessage = 'Failed to load player stats. Please check the backend.';
          this.loading = false;
        }
      });
  }

  // A clean helper function that can take ANY array of stats
  calculateObp(statsArray: PlayerGameStats[]): number {
    if (!statsArray || statsArray.length === 0) return 0;

    let totalHits = 0;
    let totalBbs = 0;
    let totalHbps = 0;
    let totalSfs = 0;
    let totalPas = 0;

    for (const stat of statsArray) {
      totalHits += stat.hits;
      totalBbs += stat.bbs;
      totalHbps += stat.hbps;
      totalSfs += stat.sfs;
      totalPas += stat.pas;
    }

    const numerator = totalHits + totalBbs + totalHbps;
    const denominator = totalPas - totalSfs;

    if (denominator <= 0) return 0;
    return numerator / denominator;
  }

  // getter for html
  get cumulativeObp(): number {
    return this.calculateObp(this.stats);
  }

  getTimeFrameString(): string {
    let timeFrame = 'All Time';

    if (this.startDate && this.endDate) {
      timeFrame = `${this.startDate} to ${this.endDate}`;
    } else if (this.startDate) {
      timeFrame = `From ${this.startDate}`;
    } else if (this.endDate) {
      timeFrame = `Until ${this.endDate}`;
    }

    return timeFrame;
  }
}

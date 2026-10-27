import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlayerGameStats, PlayerProfile } from '../../models/player-game-stats';
import { PlayerStatsService } from '../../services/player-stats';

export interface CachedSearchResult {
  playerName: string;
  playerId: number;
  startDate?: string;
  endDate?: string;
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
  batterName: string = '';
  batterId: number = 50500; // Default test ID
  startDate: string = '';
  endDate: string = '';
  
  // player search and autocomplete
  autocompletePlayers: PlayerProfile[] = [];
  showDropdown: boolean = false;
  private searchTimeout: any;

  // Data state
  stats: PlayerGameStats[] = [];
  loading: boolean = false;
  errorMessage: string = '';

  ngOnInit() {
    this.restoreChips();
  }

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    
    if (!this.batterName || this.batterName.trim().length < 2) {
      this.autocompletePlayers = [];
      this.showDropdown = false;
      return;
    }

    // Debounce by 500ms so it doesn't spam the API on every keystroke
    this.searchTimeout = setTimeout(() => {
      this.playerStatsService.getPlayerProfile(this.batterName.trim()).subscribe({
        next: (players: PlayerProfile[]) => {
          this.autocompletePlayers = players;
          this.showDropdown = players.length > 0;
        },
        error: (err: any) => {
          console.error('Error searching players:', err);
          this.autocompletePlayers = [];
          this.showDropdown = false;
        }
      });
    }, 500);
  }

  selectPlayer(player: PlayerProfile) {
    this.batterName = player.player_name;
    this.batterId = player.player_id;
    this.showDropdown = false;
    this.autocompletePlayers = [];
    
    // Automatically trigger stats search for this selected player
    this.searchStats();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-group')) {
      this.showDropdown = false;
    }
  }

  onEscapePress() {
    this.showDropdown = false;
  } 

  restoreChips() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.recentResults = JSON.parse(saved);
      } catch (e) {
        this.recentResults = [];
      }
    }
  }

  saveChip(
    playerName: string,playerId: number, startDate: string | undefined, endDate: string | undefined,
    timeFrame: string, obp: number, stats: PlayerGameStats[]) {
    const newEntry: CachedSearchResult = { playerName, playerId, startDate, endDate, timeFrame, obp, stats };

    // Filter out any exact duplicates for this player and timeframe
    this.recentResults = this.recentResults.filter(
      item => !(item.playerId === playerId && item.startDate === startDate && item.endDate === endDate)
    );

    // Push to the front and cap at 10
    this.recentResults.unshift(newEntry);
    if (this.recentResults.length > 10) {
      this.recentResults = this.recentResults.slice(0, 10);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentResults));
  }

  // When user clicks a history chip, load it directly without hitting the API!
  loadFromChip(item: CachedSearchResult) {
    this.batterName = item.playerName;
    this.batterId = item.playerId;
    this.startDate = item.startDate || '';
    this.endDate = item.endDate || '';

    this.stats = item.stats;
    this.errorMessage = '';
    this.loading = false;
  }

  clearChips() {
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
      this.saveChip(
        this.batterName,
        this.batterId, 
        this.startDate || undefined, 
        this.endDate || undefined,
        timeFrame, 
        cachedMatch.obp, 
        cachedMatch.stats);
      return;
    }

    // 2. CACHE MISS - PROCEED WITH API CALL
    this.loading = true;
    this.errorMessage = '';

    this.playerStatsService.getPlayerObpStats(this.batterId, this.startDate || undefined, this.endDate || undefined)
      .subscribe({
        next: (data) => {
          this.stats = this.sortStatsByDate(data);
          this.loading = false;

          // Calculate OBP locally or extract it from the data first, then save:
          const obp = this.calculateObp(this.stats); 

          // Save to localStorage ONLY after data is safely loaded and available
          this.saveChip(
            this.batterName,
            this.batterId, 
            this.startDate || undefined, 
            this.endDate || undefined,
            timeFrame, 
            obp, 
            this.stats);
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

  sortStatsByDate(statsArray: PlayerGameStats[]): PlayerGameStats[] {
    if (!statsArray) return [];
    // Use spread operator [...] to avoid mutating the original array reference
    return [...statsArray].sort((a, b) => a.game_date.localeCompare(b.game_date));
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


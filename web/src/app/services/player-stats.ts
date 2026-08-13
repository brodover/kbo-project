import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlayerGameStats } from '../models/player-game-stats';

@Injectable({
  providedIn: 'root'
})

export class PlayerStatsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000'; // Adjust if your FastAPI port differs

  getPlayerObpStats(batterId: number, startDate?: string, endDate?: string): Observable<PlayerGameStats[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<PlayerGameStats[]>(`${this.apiUrl}/stats/obp/${batterId}`, { params });
  }
}

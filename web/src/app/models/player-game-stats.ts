export interface PlayerGameStats {
  batter_id: number;
  game_id: string;
  hits: number;
  bbs: number;
  hbps: number;
  sfs: number;
  pas: number;
  game_date: string;
}

export interface PlayerProfile {
  player_id: number;
  player_name: string;
  birth_date: string;
  current_team: string;
  position: string;
}

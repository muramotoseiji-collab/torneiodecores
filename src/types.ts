export type Category = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Team {
  id: string;
  name: string;
  color: string;
  text_color: string;
}

export interface Confrontation {
  id: string;
  date: string;
  team1_id: string;
  team2_id: string;
  status: 'pending' | 'finished';
  team1_score: number;
  team2_score: number;
}

export interface Match {
  id: string;
  confrontation_id: string;
  category: Category;
  match_number: number;
  team1_player1: string;
  team1_player2: string;
  team2_player1: string;
  team2_player2: string;
  team1_set1: number;
  team1_set2: number;
  team1_set3: number;
  team2_set1: number;
  team2_set2: number;
  team2_set3: number;
  winner_team_id: string | null;
  status: 'pending' | 'finished';
}

export interface Ranking {
  team_id: string;
  team_name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  sets_won: number;
  cat_f_wins: number;
  cat_e_wins: number;
  cat_d_wins: number;
  cat_c_wins: number;
  cat_b_wins: number;
  cat_a_wins: number;
}

-- Teams table
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  text_color TEXT NOT NULL
);

-- Admins table for simple login
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Confrontations (e.g., Azul vs Roxo on 21/03)
CREATE TABLE confrontations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  team1_id TEXT REFERENCES teams(id),
  team2_id TEXT REFERENCES teams(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'finished'
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Matches (the 18 individual games)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confrontation_id UUID REFERENCES confrontations(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'A', 'B', 'C', 'D', 'E', 'F'
  match_number INTEGER NOT NULL,
  team1_player1 TEXT,
  team1_player2 TEXT,
  team2_player1 TEXT,
  team2_player2 TEXT,
  team1_set1 INTEGER DEFAULT 0,
  team1_set2 INTEGER DEFAULT 0,
  team1_set3 INTEGER DEFAULT 0,
  team2_set1 INTEGER DEFAULT 0,
  team2_set2 INTEGER DEFAULT 0,
  team2_set3 INTEGER DEFAULT 0,
  winner_team_id TEXT REFERENCES teams(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'finished'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Initial Teams Data
INSERT INTO teams (id, name, color, text_color) VALUES
('azul', 'AZUL', '#3b82f6', '#3b82f6'),
('roxo', 'ROXO', '#a855f7', '#a855f7'),
('branco', 'BRANCO', '#ffffff', '#ffffff'),
('vermelho', 'VERMELHO', '#ef4444', '#ef4444'),
('verde', 'VERDE', '#22c55e', '#22c55e'),
('amarelo', 'AMARELO', '#eab308', '#eab308');

-- Initial Admin Data
INSERT INTO admins (username, password) VALUES
('admin', 'admin123');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE confrontations;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

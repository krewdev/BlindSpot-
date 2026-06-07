CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT,
  wallet_address TEXT UNIQUE,
  reputation_score NUMERIC DEFAULT 50,
  matches_played INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches Table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed'
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Annotations Table (Bounding boxes drawn by players)
CREATE TABLE annotations (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  player_id UUID REFERENCES profiles(id),
  role TEXT,                     -- 'ai' or 'hunter'
  source TEXT DEFAULT 'human',   -- 'ai' or 'human'
  class_name TEXT,               -- 'person', 'car', 'box'
  x NUMERIC,
  y NUMERIC,
  width NUMERIC,
  height NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification Votes (Review rounds for player feedback)
CREATE TABLE verification_votes (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  voter_id UUID REFERENCES profiles(id),
  annotation_id BIGINT REFERENCES annotations(id),
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

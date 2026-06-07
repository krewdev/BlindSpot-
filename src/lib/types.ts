// ─── Core Profile & Match ───────────────────────────────────────────

export type JudgeTrack = 'coding' | 'general';

export type AchievementBadgeId = 'SHARP_EYE' | 'CONSENSUS_KING' | 'HACKER_PRO' | 'DATA_TYCOON' | 'SOL_VALIDATOR';

export interface AchievementBadge {
  id: AchievementBadgeId;
  name: string;
  description: string;
  icon: string;
}

export interface MatchHistoryEntry {
  id: string;
  timestamp: string;
  gameMode: GameMode;
  role: string;
  score: number;
  tokensEarned: number;
  txSig: string;
  verified: boolean;
}

export interface Profile {
  id: string;
  username: string | null;
  wallet_address: string | null;
  reputation_score: number;
  matches_played: number;
  created_at: string;
  judge_track?: JudgeTrack;
  badges?: AchievementBadgeId[];
}

export type MatchStatus = 'waiting' | 'in_progress' | 'completed';

export interface Match {
  id: string;
  status: MatchStatus;
  player1_id: string | null;
  player2_id: string | null;
  created_at: string;
}

// ─── Game Mode System ───────────────────────────────────────────────

export type GameMode = 'vision_hunt' | 'the_judge' | 'caption_clash' | 'bug_bounty';

export interface GameModeConfig {
  id: GameMode;
  name: string;
  tagline: string;
  description: string;
  icon: string; // lucide icon name
  dataType: string; // what kind of AI training data this produces
  rewardPerRound: number;
  color: string; // accent color class
}

// ─── Vision Hunt Types (Existing) ───────────────────────────────────

export type PlayerRole = 'ai' | 'hunter';
export type ObjectClass = 'person' | 'car' | 'box';

export interface Annotation {
  id?: number;
  match_id: string;
  player_id: string;
  role: PlayerRole;
  source?: 'ai' | 'human';
  class_name: ObjectClass;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at?: string;
}

export interface VerificationVote {
  id?: number;
  match_id: string;
  voter_id: string;
  annotation_id: number;
  is_correct: boolean;
  created_at?: string;
}

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  className: ObjectClass;
  isAi?: boolean;
}

// ─── The Judge (RLHF) Types ─────────────────────────────────────────

export interface RLHFPrompt {
  id: string;
  prompt: string;
  responseA: string;
  responseB: string;
  modelA: string; // e.g., "GPT-4", "Claude 3"
  modelB: string;
  category: 'reasoning' | 'creativity' | 'factual' | 'coding' | 'safety';
  difficulty: 'easy' | 'medium' | 'hard';
}

export type RLHFChoice = 'A' | 'B' | 'tie' | null;

export interface RLHFJudgment {
  promptId: string;
  playerId: string;
  choice: RLHFChoice;
  reasoning: string;
  timeSpentMs: number;
  timestamp: string;
}

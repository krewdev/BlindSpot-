import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Box, Profile, Match, PlayerRole, ObjectClass, GameMode, RLHFPrompt, RLHFChoice, JudgeTrack, MatchHistoryEntry, AchievementBadgeId } from '@/lib/types';
import { scoreMatch } from '@/lib/scoring';
import { MOCK_RLHF_PROMPTS } from '@/lib/gameModes';
import { dbSyncProfile, dbAddMatch } from '@/lib/db';

const isClient = typeof window !== 'undefined';

const customStorage = {
  getItem: (name: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: (name: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(name);
    } catch {}
  }
};

interface GameState {
  // ─── Core State ────────────────────────────────────────────────────
  profile: Profile | null;
  currentMatch: Match | null;
  gameMode: GameMode;
  matchScore: number | null;
  queueStatus: 'idle' | 'searching' | 'matched';
  earnedTokens: number;
  matchHistory: MatchHistoryEntry[];
  modelStatsHistory: {
    round: string;
    vision: number;
    rlhf: number;
    caption: number;
    security: number;
  }[];

  // ─── Vision Hunt State ─────────────────────────────────────────────
  playerRole: PlayerRole;
  selectedClass: ObjectClass;
  boxes: Box[];
  currentImageIndex: number;
  matchImages: string[];
  aiBoxes: Box[];

  // ─── The Judge (RLHF) State ────────────────────────────────────────
  currentPromptIndex: number;
  rlhfPrompts: RLHFPrompt[];
  totalJudgments: number;
  judgeStreak: number;
  judgeTrack: JudgeTrack | null;

  // ─── Caption Clash State ───────────────────────────────────────────
  captionClashCrops: { id: string; image: string; box: Box; originalClass: string }[];
  currentCropIndex: number;

  // ─── Cyber Siege Hacking State ─────────────────────────────────────
  terminalLogs: string[];
  terminalChallengeSolved: boolean;

  // ─── HUD Stats ─────────────────────────────────────────────────────
  modelStats: {
    visionMap: number;
    rlhfPref: number;
    captionAlign: number;
    securityDefense: number;
  };

  // ─── Actions ───────────────────────────────────────────────────────
  setProfile: (profile: Profile | null) => void;
  updateUsername: (username: string) => void;
  connectWallet: (walletAddress: string) => void;
  logout: () => void;
  setMatch: (match: Match | null) => void;
  setGameMode: (mode: GameMode) => void;
  setQueueStatus: (status: 'idle' | 'searching' | 'matched') => void;

  // Vision Hunt Actions
  setRole: (role: PlayerRole) => void;
  setSelectedClass: (cls: ObjectClass) => void;
  addBox: (box: Box) => void;
  removeBox: (id: string) => void;
  clearBoxes: () => void;
  submitBoxes: (txSig?: string) => void;

  // Judge Actions
  submitJudgment: (choice: RLHFChoice, reasoning: string, txSig?: string) => void;
  setJudgeTrack: (track: JudgeTrack) => void;

  // Caption Clash Actions
  submitCaption: (caption: string, txSig?: string) => void;

  // Hacking Actions
  submitHackingCommand: (command: string, txSig?: string) => void;

  // Shared Actions
  nextRound: () => void;
  resetGame: () => void;
}

// ─── Vision Hunt Data ─────────────────────────────────────────────────

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1519003722824-192d992a6058?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
];

const MOCK_AI_BOXES: Box[][] = [
  [{ id: 'ai-1', x: 200, y: 300, width: 100, height: 150, className: 'car', isAi: true }],
  [{ id: 'ai-2', x: 400, y: 500, width: 200, height: 100, className: 'car', isAi: true }],
  [{ id: 'ai-3', x: 100, y: 200, width: 50, height: 150, className: 'person', isAi: true }],
];

// Seed history for charts
export const SEED_MODEL_ACCURACY_HISTORY = [
  { round: 'R1', vision: 76.5, rlhf: 68.2, caption: 55.4, security: 82.1 },
  { round: 'R2', vision: 77.2, rlhf: 69.1, caption: 56.2, security: 83.5 },
  { round: 'R3', vision: 78.0, rlhf: 70.0, caption: 57.8, security: 84.2 },
  { round: 'R4', vision: 78.9, rlhf: 71.3, caption: 59.1, security: 85.0 },
  { round: 'R5', vision: 79.5, rlhf: 72.5, caption: 60.5, security: 86.4 },
  { round: 'R6', vision: 80.2, rlhf: 73.8, caption: 62.0, security: 87.1 },
  { round: 'R7', vision: 81.0, rlhf: 74.2, caption: 63.4, security: 88.0 },
  { round: 'R8', vision: 81.8, rlhf: 75.0, caption: 64.2, security: 89.2 },
  { round: 'R9', vision: 82.5, rlhf: 76.1, caption: 65.5, security: 90.0 },
  { round: 'R10', vision: 83.1, rlhf: 76.9, caption: 66.8, security: 90.5 },
  { round: 'R11', vision: 83.8, rlhf: 77.8, caption: 67.5, security: 91.0 },
  { round: 'R12', vision: 84.2, rlhf: 78.5, caption: 68.1, security: 91.5 },
];

const checkBadges = (
  updatedHistory: MatchHistoryEntry[],
  earnedTokens: number,
  judgeStreak: number,
  terminalChallengeSolved: boolean,
  currentBadges: AchievementBadgeId[] = []
): AchievementBadgeId[] => {
  const newBadges = [...currentBadges];
  
  // 1. Sharp Eye
  const visionCount = updatedHistory.filter(m => m.gameMode === 'vision_hunt').length;
  const hasPerfectVision = updatedHistory.some(m => m.gameMode === 'vision_hunt' && m.score === 100);
  if ((visionCount >= 2 || hasPerfectVision) && !newBadges.includes('SHARP_EYE')) {
    newBadges.push('SHARP_EYE');
  }

  // 2. Consensus King
  if (judgeStreak >= 3 && !newBadges.includes('CONSENSUS_KING')) {
    newBadges.push('CONSENSUS_KING');
  }

  // 3. Hacker Pro
  if (terminalChallengeSolved && !newBadges.includes('HACKER_PRO')) {
    newBadges.push('HACKER_PRO');
  }

  // 4. Data Tycoon
  if (updatedHistory.length >= 5 && !newBadges.includes('DATA_TYCOON')) {
    newBadges.push('DATA_TYCOON');
  }

  // 5. Solana Validator
  if (earnedTokens >= 2.0 && !newBadges.includes('SOL_VALIDATOR')) {
    newBadges.push('SOL_VALIDATOR');
  }

  return newBadges;
};

// ─── Store ────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Core
      profile: null,
      currentMatch: null,
      gameMode: 'vision_hunt',
      matchScore: null,
      queueStatus: 'idle',
      earnedTokens: 0,
      matchHistory: [],
      modelStatsHistory: SEED_MODEL_ACCURACY_HISTORY,

      // Vision Hunt
      playerRole: 'hunter',
      selectedClass: 'person',
      boxes: [],
      currentImageIndex: 0,
      matchImages: DEFAULT_IMAGES,
      aiBoxes: MOCK_AI_BOXES[0],

      // The Judge
      currentPromptIndex: 0,
      rlhfPrompts: MOCK_RLHF_PROMPTS,
      totalJudgments: 0,
      judgeStreak: 0,
      judgeTrack: null,

      // Caption Clash
      captionClashCrops: [
        {
          id: 'crop-1',
          image: 'https://images.unsplash.com/photo-1519003722824-192d992a6058?auto=format&fit=crop&q=80&w=800',
          box: { id: 'ai-1', x: 200, y: 300, width: 100, height: 150, className: 'car' },
          originalClass: 'car',
        },
        {
          id: 'crop-2',
          image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800',
          box: { id: 'ai-2', x: 400, y: 500, width: 200, height: 100, className: 'car' },
          originalClass: 'car',
        },
        {
          id: 'crop-3',
          image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
          box: { id: 'ai-3', x: 100, y: 200, width: 50, height: 150, className: 'person' },
          originalClass: 'person',
        }
      ],
      currentCropIndex: 0,

      // Cyber Siege Hacking
      terminalLogs: [
        'Initializing secure VPN connection to sandbox target...',
        'Target IP: 10.0.4.99 (Vulnerable API node)',
        'Status: Connected. System telemetry active.',
        'AI Logger: Recording shell telemetry to fine-tune Security Model...',
        'Enter "help" to list available commands.'
      ],
      terminalChallengeSolved: false,

      // HUD stats
      modelStats: {
        visionMap: 84.20,
        rlhfPref: 78.50,
        captionAlign: 68.10,
        securityDefense: 91.50,
      },

      // ─── Core Actions ──────────────────────────────────────────────────

      setProfile: (profile) => set({ profile }),
      updateUsername: (username) => {
        set((state) => {
          const updatedProfile = state.profile ? { ...state.profile, username } : null;
          if (updatedProfile) {
            dbSyncProfile(updatedProfile).catch(err => console.error("Error syncing profile:", err));
          }
          return { profile: updatedProfile };
        });
      },
      connectWallet: (walletAddress) => {
        set((state) => {
          const updatedProfile = state.profile ? { ...state.profile, wallet_address: walletAddress } : null;
          if (updatedProfile) {
            dbSyncProfile(updatedProfile).catch(err => console.error("Error syncing profile:", err));
          }
          return { profile: updatedProfile };
        });
      },
      logout: () => set({
        profile: null,
        currentMatch: null,
        matchScore: null,
        queueStatus: 'idle',
        playerRole: 'hunter',
        selectedClass: 'person',
        boxes: [],
        currentImageIndex: 0,
        currentPromptIndex: 0,
        rlhfPrompts: MOCK_RLHF_PROMPTS,
        totalJudgments: 0,
        judgeStreak: 0,
        judgeTrack: null,
        currentCropIndex: 0,
        terminalChallengeSolved: false,
        terminalLogs: [
          'Initializing secure VPN connection to sandbox target...',
          'Target IP: 10.0.4.99 (Vulnerable API node)',
          'Status: Connected. System telemetry active.',
          'AI Logger: Recording shell telemetry to fine-tune Security Model...',
          'Enter "help" to list available commands.'
        ]
      }),
      setMatch: (match) => set({ currentMatch: match }),
      setGameMode: (gameMode) => set({ gameMode }),
      setQueueStatus: (queueStatus) => set({ queueStatus }),

      // ─── Vision Hunt Actions ───────────────────────────────────────────

      setRole: (role) => set({ playerRole: role }),
      setSelectedClass: (selectedClass) => set({ selectedClass }),
      addBox: (box) => set((state) => ({ boxes: [...state.boxes, box] })),
      removeBox: (id) => set((state) => ({
        boxes: state.boxes.filter((box) => box.id !== id),
      })),
      clearBoxes: () => set({ boxes: [] }),

      submitBoxes: (txSig) => {
        const { boxes, aiBoxes, selectedClass } = get();
        const { overallScore } = scoreMatch(aiBoxes, boxes);

        let finalScore = 0;
        if (boxes.length > 0) {
          if (overallScore > 10) {
            finalScore = 0; // Copied AI
          } else {
            finalScore = 100; // Found blindspot!
          }
        }

        const tokens = finalScore === 100 ? 0.15 : 0;
        
        set((state) => {
          const nextVisionMap = Math.min(100, state.modelStats.visionMap + (finalScore === 100 ? 0.12 : 0.01));
          const newModelStats = {
            ...state.modelStats,
            visionMap: nextVisionMap
          };

          const newRound = `R${state.modelStatsHistory.length + 1}`;
          const newHistoryEntry = {
            round: newRound,
            vision: parseFloat(nextVisionMap.toFixed(2)),
            rlhf: parseFloat(state.modelStats.rlhfPref.toFixed(2)),
            caption: parseFloat(state.modelStats.captionAlign.toFixed(2)),
            security: parseFloat(state.modelStats.securityDefense.toFixed(2))
          };

          const resolvedTxSig = txSig || `tx-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
          const matchId = `match-${Math.random().toString(36).substring(2, 9)}`;

          const newMatch: MatchHistoryEntry = {
            id: matchId,
            timestamp: new Date().toISOString(),
            gameMode: 'vision_hunt',
            role: `Hunter (${selectedClass})`,
            score: finalScore,
            tokensEarned: tokens,
            txSig: resolvedTxSig,
            verified: true
          };

          const updatedHistory = [...state.matchHistory, newMatch];
          const earned = state.earnedTokens + tokens;
          const newBadges = checkBadges(updatedHistory, earned, state.judgeStreak, state.terminalChallengeSolved, state.profile?.badges);

          const updatedProfile: Profile | null = state.profile
            ? {
                ...state.profile,
                matches_played: state.profile.matches_played + 1,
                badges: newBadges
              }
            : null;

          return {
            matchScore: finalScore,
            earnedTokens: earned,
            modelStats: newModelStats,
            modelStatsHistory: [...state.modelStatsHistory, newHistoryEntry],
            matchHistory: updatedHistory,
            profile: updatedProfile
          };
        });

        const updatedProfile = get().profile;
        const newMatch = get().matchHistory[get().matchHistory.length - 1];

        if (updatedProfile) {
          dbSyncProfile(updatedProfile).catch(err => console.error("Error syncing profile:", err));
          if (newMatch) {
            dbAddMatch(newMatch, updatedProfile.id).catch(err => console.error("Error adding match:", err));
          }
        }
      },

      // ─── Judge Actions ─────────────────────────────────────────────────

      setJudgeTrack: (track: JudgeTrack) => {
        const filtered = track === 'coding'
          ? MOCK_RLHF_PROMPTS.filter(p => p.category === 'coding')
          : MOCK_RLHF_PROMPTS.filter(p => p.category !== 'coding');
        set({ judgeTrack: track, rlhfPrompts: filtered, currentPromptIndex: 0 });
      },

      submitJudgment: (choice, reasoning, txSig) => {
        const prompt = get().rlhfPrompts[get().currentPromptIndex];

        const aLen = prompt.responseA.length;
        const bLen = prompt.responseB.length;
        const consensusChoice: RLHFChoice = bLen > aLen ? 'B' : 'A';

        const agreedWithConsensus = choice === consensusChoice;
        const baseReward = 0.25;
        const reasoningBonus = reasoning.length > 10 ? baseReward : 0;
        const streakBonus = agreedWithConsensus ? 0.05 * get().judgeStreak : 0;
        const totalReward = agreedWithConsensus ? baseReward + reasoningBonus + streakBonus : 0.05;

        const score = agreedWithConsensus ? 100 : 25;

        set((state) => {
          const nextRlhfPref = Math.min(100, state.modelStats.rlhfPref + (agreedWithConsensus ? 0.08 : 0.01));
          const newModelStats = {
            ...state.modelStats,
            rlhfPref: nextRlhfPref
          };

          const newRound = `R${state.modelStatsHistory.length + 1}`;
          const newHistoryEntry = {
            round: newRound,
            vision: parseFloat(state.modelStats.visionMap.toFixed(2)),
            rlhf: parseFloat(nextRlhfPref.toFixed(2)),
            caption: parseFloat(state.modelStats.captionAlign.toFixed(2)),
            security: parseFloat(state.modelStats.securityDefense.toFixed(2))
          };

          const resolvedTxSig = txSig || `tx-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
          const matchId = `match-${Math.random().toString(36).substring(2, 9)}`;

          const currentStreak = agreedWithConsensus ? state.judgeStreak + 1 : 0;

          const newMatch: MatchHistoryEntry = {
            id: matchId,
            timestamp: new Date().toISOString(),
            gameMode: 'the_judge',
            role: `Judge (${state.judgeTrack || 'general'})`,
            score,
            tokensEarned: totalReward,
            txSig: resolvedTxSig,
            verified: true
          };

          const updatedHistory = [...state.matchHistory, newMatch];
          const earned = state.earnedTokens + totalReward;
          const newBadges = checkBadges(updatedHistory, earned, currentStreak, state.terminalChallengeSolved, state.profile?.badges);

          const updatedProfile: Profile | null = state.profile
            ? {
                ...state.profile,
                matches_played: state.profile.matches_played + 1,
                badges: newBadges
              }
            : null;

          return {
            matchScore: score,
            earnedTokens: earned,
            totalJudgments: state.totalJudgments + 1,
            judgeStreak: currentStreak,
            modelStats: newModelStats,
            modelStatsHistory: [...state.modelStatsHistory, newHistoryEntry],
            matchHistory: updatedHistory,
            profile: updatedProfile
          };
        });

        const updatedProfile = get().profile;
        const newMatch = get().matchHistory[get().matchHistory.length - 1];

        if (updatedProfile) {
          dbSyncProfile(updatedProfile).catch(err => console.error("Error syncing profile:", err));
          if (newMatch) {
            dbAddMatch(newMatch, updatedProfile.id).catch(err => console.error("Error adding match:", err));
          }
        }
      },

      // ─── Caption Clash Actions ─────────────────────────────────────────

      submitCaption: (caption, txSig) => {
        const isDescriptive = caption.trim().length > 10;
        const score = isDescriptive ? 100 : 30;
        const reward = isDescriptive ? 0.20 : 0.05;

        set((state) => {
          const nextCaptionAlign = Math.min(100, state.modelStats.captionAlign + (isDescriptive ? 0.15 : 0.02));
          const newModelStats = {
            ...state.modelStats,
            captionAlign: nextCaptionAlign
          };

          const newRound = `R${state.modelStatsHistory.length + 1}`;
          const newHistoryEntry = {
            round: newRound,
            vision: parseFloat(state.modelStats.visionMap.toFixed(2)),
            rlhf: parseFloat(state.modelStats.rlhfPref.toFixed(2)),
            caption: parseFloat(nextCaptionAlign.toFixed(2)),
            security: parseFloat(state.modelStats.securityDefense.toFixed(2))
          };

          const resolvedTxSig = txSig || `tx-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
          const matchId = `match-${Math.random().toString(36).substring(2, 9)}`;

          const newMatch: MatchHistoryEntry = {
            id: matchId,
            timestamp: new Date().toISOString(),
            gameMode: 'caption_clash',
            role: 'Writer',
            score,
            tokensEarned: reward,
            txSig: resolvedTxSig,
            verified: true
          };

          const updatedHistory = [...state.matchHistory, newMatch];
          const earned = state.earnedTokens + reward;
          const newBadges = checkBadges(updatedHistory, earned, state.judgeStreak, state.terminalChallengeSolved, state.profile?.badges);

          const updatedProfile: Profile | null = state.profile
            ? {
                ...state.profile,
                matches_played: state.profile.matches_played + 1,
                badges: newBadges
              }
            : null;

          return {
            matchScore: score,
            earnedTokens: earned,
            modelStats: newModelStats,
            modelStatsHistory: [...state.modelStatsHistory, newHistoryEntry],
            matchHistory: updatedHistory,
            profile: updatedProfile
          };
        });

        const updatedProfile = get().profile;
        const newMatch = get().matchHistory[get().matchHistory.length - 1];

        if (updatedProfile) {
          dbSyncProfile(updatedProfile).catch(err => console.error("Error syncing profile:", err));
          if (newMatch) {
            dbAddMatch(newMatch, updatedProfile.id).catch(err => console.error("Error adding match:", err));
          }
        }
      },

      // ─── Cyber Siege Actions ───────────────────────────────────────────

      submitHackingCommand: (command, txSig) => {
        const cmd = command.trim().toLowerCase();
        const logs = [...get().terminalLogs, `hunter@blindspot:~$ ${command}`];
        
        if (cmd === 'help') {
          logs.push(
            'Available commands:',
            '  scan         Run vulnerability scanner on target',
            '  exploit      Execute attack payload against scanned port',
            '  cat flag.txt Read root flag if compromised',
            '  clear        Clear screen logs'
          );
          set({ terminalLogs: logs });
        } else if (cmd === 'clear') {
          set({ terminalLogs: [] });
        } else if (cmd === 'scan') {
          logs.push(
            'Scanning target 10.0.4.99...',
            'Found open port: 8080 (HTTP Server)',
            'Vulnerability Detected: Unauthenticated SQL Injection in API endpoint /api/users?id='
          );
          set({ terminalLogs: logs });
        } else if (cmd === 'exploit') {
          if (!get().terminalLogs.some(l => l.includes('SQL Injection'))) {
            logs.push('Error: Exploit failed. You must scan the target to locate vulnerabilities first!');
          } else {
            logs.push(
              'Injecting SQL payload: UNION SELECT username, password FROM users...',
              'Bypassing authentication credentials...',
              'Exploit Successful! Root access gained. flag.txt is located at /root/flag.txt'
            );
          }
          set({ terminalLogs: logs });
        } else if (cmd === 'cat flag.txt') {
          if (!get().terminalLogs.some(l => l.includes('Exploit Successful'))) {
            logs.push('cat: flag.txt: Permission denied. Target is not compromised.');
            set({ terminalLogs: logs });
          } else {
            logs.push(
              'FLAG: BLND_ARENA_PWN_SUCCESS_77',
              'Congratulations! Duel won. Telemetry logged. Claiming bounty...'
            );
            
            set((state) => {
              const nextSecurityDefense = Math.min(100, state.modelStats.securityDefense + 0.25);
              const newModelStats = {
                ...state.modelStats,
                securityDefense: nextSecurityDefense
              };

              const newRound = `R${state.modelStatsHistory.length + 1}`;
              const newHistoryEntry = {
                round: newRound,
                vision: parseFloat(state.modelStats.visionMap.toFixed(2)),
                rlhf: parseFloat(state.modelStats.rlhfPref.toFixed(2)),
                caption: parseFloat(state.modelStats.captionAlign.toFixed(2)),
                security: parseFloat(nextSecurityDefense.toFixed(2))
              };

              const resolvedTxSig = txSig || `tx-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
              const matchId = `match-${Math.random().toString(36).substring(2, 9)}`;

              const newMatch: MatchHistoryEntry = {
                id: matchId,
                timestamp: new Date().toISOString(),
                gameMode: 'bug_bounty',
                role: 'Hacker',
                score: 100,
                tokensEarned: 0.30,
                txSig: resolvedTxSig,
                verified: true
              };

              const updatedHistory = [...state.matchHistory, newMatch];
              const earned = state.earnedTokens + 0.30;
              const newBadges = checkBadges(updatedHistory, earned, state.judgeStreak, true, state.profile?.badges);

              const updatedProfile: Profile | null = state.profile
                ? {
                    ...state.profile,
                    matches_played: state.profile.matches_played + 1,
                    badges: newBadges
                  }
                : null;

              return {
                terminalLogs: logs,
                terminalChallengeSolved: true,
                matchScore: 100,
                earnedTokens: earned,
                modelStats: newModelStats,
                modelStatsHistory: [...state.modelStatsHistory, newHistoryEntry],
                matchHistory: updatedHistory,
                profile: updatedProfile
              };
            });

            const updatedProfile = get().profile;
            const newMatch = get().matchHistory[get().matchHistory.length - 1];

            if (updatedProfile) {
              dbSyncProfile(updatedProfile).catch(err => console.error("Error syncing profile:", err));
              if (newMatch) {
                dbAddMatch(newMatch, updatedProfile.id).catch(err => console.error("Error adding match:", err));
              }
            }
          }
        } else {
          logs.push(`shell: command not found: ${command}. Type 'help' for instructions.`);
          set({ terminalLogs: logs });
        }
      },

      // ─── Shared Actions ────────────────────────────────────────────────

      nextRound: () => set((state) => {
        if (state.gameMode === 'the_judge') {
          const nextIndex = (state.currentPromptIndex + 1) % state.rlhfPrompts.length;
          return {
            currentPromptIndex: nextIndex,
            matchScore: null,
          };
        }
        if (state.gameMode === 'caption_clash') {
          const nextIndex = (state.currentCropIndex + 1) % state.captionClashCrops.length;
          return {
            currentCropIndex: nextIndex,
            matchScore: null,
          };
        }
        if (state.gameMode === 'bug_bounty') {
          return {
            terminalChallengeSolved: false,
            terminalLogs: [
              'Initializing secure VPN connection to sandbox target...',
              'Target IP: 10.0.4.99 (Vulnerable API node)',
              'Status: Connected. System telemetry active.',
              'AI Logger: Recording shell telemetry to fine-tune Security Model...',
              'Enter "help" to list available commands.'
            ],
            matchScore: null,
          };
        }
        // Vision Hunt
        const nextIndex = (state.currentImageIndex + 1) % state.matchImages.length;
        return {
          currentImageIndex: nextIndex,
          boxes: [],
          aiBoxes: MOCK_AI_BOXES[nextIndex],
          matchScore: null,
          playerRole: 'hunter' as PlayerRole,
        };
      }),

      resetGame: () => set({
        currentMatch: null,
        matchScore: null,
        queueStatus: 'idle',
        // Vision Hunt reset
        playerRole: 'hunter',
        selectedClass: 'person',
        boxes: [],
        currentImageIndex: 0,
        aiBoxes: MOCK_AI_BOXES[0],
        // Judge reset
        currentPromptIndex: 0,
        rlhfPrompts: MOCK_RLHF_PROMPTS,
        totalJudgments: 0,
        judgeStreak: 0,
        judgeTrack: null,
        // Caption Clash reset
        currentCropIndex: 0,
        // Cyber Siege reset
        terminalChallengeSolved: false,
        terminalLogs: [
          'Initializing secure VPN connection to sandbox target...',
          'Target IP: 10.0.4.99 (Vulnerable API node)',
          'Status: Connected. System telemetry active.',
          'AI Logger: Recording shell telemetry to fine-tune Security Model...',
          'Enter "help" to list available commands.'
        ]
      }),
    }),
    {
      name: 'blindspot-game-state-v1',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        profile: state.profile,
        earnedTokens: state.earnedTokens,
        totalJudgments: state.totalJudgments,
        judgeStreak: state.judgeStreak,
        modelStats: state.modelStats,
        modelStatsHistory: state.modelStatsHistory,
        matchHistory: state.matchHistory,
      }),
    }
  )
);


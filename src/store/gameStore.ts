import { create } from 'zustand';
import { Box, Profile, Match, PlayerRole, ObjectClass, GameMode, RLHFPrompt, RLHFChoice } from '@/lib/types';
import { scoreMatch } from '@/lib/scoring';
import { MOCK_RLHF_PROMPTS } from '@/lib/gameModes';

interface GameState {
  // ─── Core State ────────────────────────────────────────────────────
  profile: Profile | null;
  currentMatch: Match | null;
  gameMode: GameMode;
  matchScore: number | null;
  queueStatus: 'idle' | 'searching' | 'matched';
  earnedTokens: number;

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
  setMatch: (match: Match | null) => void;
  setGameMode: (mode: GameMode) => void;
  setQueueStatus: (status: 'idle' | 'searching' | 'matched') => void;

  // Vision Hunt Actions
  setRole: (role: PlayerRole) => void;
  setSelectedClass: (cls: ObjectClass) => void;
  addBox: (box: Box) => void;
  removeBox: (id: string) => void;
  clearBoxes: () => void;
  submitBoxes: () => void;

  // Judge Actions
  submitJudgment: (choice: RLHFChoice, reasoning: string) => void;

  // Caption Clash Actions
  submitCaption: (caption: string) => void;

  // Hacking Actions
  submitHackingCommand: (command: string) => void;

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

// ─── Store ────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  // Core
  profile: null,
  currentMatch: null,
  gameMode: 'vision_hunt',
  matchScore: null,
  queueStatus: 'idle',
  earnedTokens: 0,

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

  submitBoxes: () => {
    const { boxes, aiBoxes } = get();
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
    set((state) => ({
      matchScore: finalScore,
      earnedTokens: state.earnedTokens + tokens,
      modelStats: {
        ...state.modelStats,
        visionMap: Math.min(100, state.modelStats.visionMap + (finalScore === 100 ? 0.12 : 0.01))
      }
    }));
  },

  // ─── Judge Actions ─────────────────────────────────────────────────

  submitJudgment: (choice, reasoning) => {
    // In production, this would send the judgment to the backend.
    // For now, we mock consensus scoring.
    // The "consensus" is that the better response gets rewarded.
    const prompt = get().rlhfPrompts[get().currentPromptIndex];

    // Simple mock: if player chose the longer/more detailed response, they "agree with consensus"
    const aLen = prompt.responseA.length;
    const bLen = prompt.responseB.length;
    const consensusChoice: RLHFChoice = bLen > aLen ? 'B' : 'A';

    const agreedWithConsensus = choice === consensusChoice;
    const baseReward = 0.25;
    const reasoningBonus = reasoning.length > 10 ? baseReward : 0; // 2x for reasoning
    const streakBonus = agreedWithConsensus ? 0.05 * get().judgeStreak : 0;
    const totalReward = agreedWithConsensus ? baseReward + reasoningBonus + streakBonus : 0.05; // small participation reward

    const score = agreedWithConsensus ? 100 : 25;

    set((state) => ({
      matchScore: score,
      earnedTokens: state.earnedTokens + totalReward,
      totalJudgments: state.totalJudgments + 1,
      judgeStreak: agreedWithConsensus ? state.judgeStreak + 1 : 0,
      modelStats: {
        ...state.modelStats,
        rlhfPref: Math.min(100, state.modelStats.rlhfPref + (agreedWithConsensus ? 0.08 : 0.01))
      }
    }));
  },

  // ─── Caption Clash Actions ─────────────────────────────────────────

  submitCaption: (caption) => {
    const isDescriptive = caption.trim().length > 10;
    const score = isDescriptive ? 100 : 30;
    const reward = isDescriptive ? 0.20 : 0.05;

    set((state) => ({
      matchScore: score,
      earnedTokens: state.earnedTokens + reward,
      modelStats: {
        ...state.modelStats,
        captionAlign: Math.min(100, state.modelStats.captionAlign + (isDescriptive ? 0.15 : 0.02))
      }
    }));
  },

  // ─── Cyber Siege Actions ───────────────────────────────────────────

  submitHackingCommand: (command) => {
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
        set((state) => ({
          terminalLogs: logs,
          terminalChallengeSolved: true,
          matchScore: 100,
          earnedTokens: state.earnedTokens + 0.30,
          modelStats: {
            ...state.modelStats,
            securityDefense: Math.min(100, state.modelStats.securityDefense + 0.25)
          }
        }));
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
}));

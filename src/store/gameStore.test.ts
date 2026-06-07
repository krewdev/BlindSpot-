import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { Box } from '@/lib/types';

describe('useGameStore', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useGameStore.getState().resetGame();
    useGameStore.setState({ earnedTokens: 0 });
  });

  it('has correct default initial state', () => {
    const state = useGameStore.getState();
    expect(state.profile).toBeNull();
    expect(state.currentMatch).toBeNull();
    expect(state.gameMode).toBe('vision_hunt');
    expect(state.matchScore).toBeNull();
    expect(state.queueStatus).toBe('idle');
    expect(state.earnedTokens).toBe(0);
    expect(state.boxes).toEqual([]);
    expect(state.currentPromptIndex).toBe(0);
    expect(state.totalJudgments).toBe(0);
    expect(state.judgeStreak).toBe(0);
  });

  it('handles game mode configuration switching', () => {
    useGameStore.getState().setGameMode('the_judge');
    expect(useGameStore.getState().gameMode).toBe('the_judge');
  });

  describe('Vision Hunt Bounding Box Actions', () => {
    const testBox: Box = { id: 'box-1', x: 10, y: 10, width: 50, height: 50, className: 'person' };

    it('adds drawn bounding boxes', () => {
      useGameStore.getState().addBox(testBox);
      expect(useGameStore.getState().boxes).toHaveLength(1);
      expect(useGameStore.getState().boxes[0]).toEqual(testBox);
    });

    it('removes drawn bounding boxes by id', () => {
      useGameStore.getState().addBox(testBox);
      useGameStore.getState().removeBox('box-1');
      expect(useGameStore.getState().boxes).toHaveLength(0);
    });

    it('clears drawn boxes completely', () => {
      useGameStore.getState().addBox(testBox);
      useGameStore.getState().clearBoxes();
      expect(useGameStore.getState().boxes).toHaveLength(0);
    });

    it('scores match correctly when drawing distinct boxes (blindspot found)', () => {
      // Setup state: AI box is at (200, 300).
      // Player box is placed far away (e.g. 50, 50), which does not overlap AI box.
      // So IoU is 0 (below 0.1 threshold in store calculation).
      useGameStore.setState({
        aiBoxes: [{ id: 'ai-1', x: 200, y: 300, width: 100, height: 150, className: 'car', isAi: true }]
      });
      useGameStore.getState().addBox({ id: 'p-1', x: 50, y: 50, width: 100, height: 100, className: 'car' });
      useGameStore.getState().submitBoxes();

      const state = useGameStore.getState();
      expect(state.matchScore).toBe(100); // Found blindspot!
      expect(state.earnedTokens).toBe(0.15); // Reward awarded
    });

    it('penalizes copycat boxes overlapping AI annotations', () => {
      // Setup state: AI box is at (200, 300).
      // Player box is drawn exactly over the AI box (200, 300), which copies it.
      useGameStore.setState({
        aiBoxes: [{ id: 'ai-1', x: 200, y: 300, width: 100, height: 150, className: 'car', isAi: true }]
      });
      useGameStore.getState().addBox({ id: 'p-1', x: 200, y: 300, width: 100, height: 150, className: 'car' });
      useGameStore.getState().submitBoxes();

      const state = useGameStore.getState();
      expect(state.matchScore).toBe(0); // Copied AI
      expect(state.earnedTokens).toBe(0); // No rewards
    });
  });

  describe('The Judge Mode Actions', () => {
    it('handles consensus checks, increments streaks, and tracks rewards', () => {
      // Mock prompts inside the store.
      // Prompt 1: Response B (len: 300) is longer than Response A (len: 100).
      // So B is the consensus choice in mock logic.
      useGameStore.setState({
        rlhfPrompts: [
          {
            id: 'test-prompt-1',
            prompt: 'Test prompt?',
            responseA: 'Short answer', // len: 12
            responseB: 'Extremely detailed answer that is much longer.', // len: 46
            modelA: 'Model A',
            modelB: 'Model B',
            category: 'reasoning',
            difficulty: 'easy'
          }
        ],
        currentPromptIndex: 0,
        judgeStreak: 2
      });

      // Player picks B (consensus!) and provides reasoning (earns bonus).
      useGameStore.getState().submitJudgment('B', 'Reasoning longer than 10 chars', 1200);

      const state = useGameStore.getState();
      expect(state.matchScore).toBe(100); // Consensus match!
      expect(state.totalJudgments).toBe(1);
      expect(state.judgeStreak).toBe(3); // Increment streak from 2 to 3
      // Base: 0.25, Reasoning: 0.25, Streak: 0.05 * 2 = 0.10. Total = 0.60
      expect(state.earnedTokens).toBeCloseTo(0.60, 2);
    });

    it('gives minor participation reward when deviating from consensus', () => {
      useGameStore.setState({
        rlhfPrompts: [
          {
            id: 'test-prompt-1',
            prompt: 'Test prompt?',
            responseA: 'Short answer', // len: 12
            responseB: 'Extremely detailed answer that is much longer.', // len: 46
            modelA: 'Model A',
            modelB: 'Model B',
            category: 'reasoning',
            difficulty: 'easy'
          }
        ],
        currentPromptIndex: 0,
        judgeStreak: 4
      });

      // Player picks A (against consensus)
      useGameStore.getState().submitJudgment('A', 'Short', 1200);

      const state = useGameStore.getState();
      expect(state.matchScore).toBe(25); // Minor score
      expect(state.judgeStreak).toBe(0); // Streak resets
      expect(state.earnedTokens).toBe(0.05); // Small participation token
    });
  });

  describe('Caption Clash Mode Actions', () => {
    it('rewards descriptive captions with 100 score and 0.20 tokens', () => {
      useGameStore.getState().submitCaption('A beautiful blue sports car parked in front of a modern house.');
      const state = useGameStore.getState();
      expect(state.matchScore).toBe(100);
      expect(state.earnedTokens).toBe(0.20);
      expect(state.modelStats.captionAlign).toBeGreaterThan(68.10); // starts at 68.10
    });

    it('gives low score and 0.05 tokens for short captions', () => {
      useGameStore.getState().submitCaption('Short');
      const state = useGameStore.getState();
      expect(state.matchScore).toBe(30);
      expect(state.earnedTokens).toBe(0.05);
    });
  });

  describe('Cyber Siege Hacking Mode Actions', () => {
    it('provides terminal help command info', () => {
      useGameStore.getState().submitHackingCommand('help');
      const state = useGameStore.getState();
      expect(state.terminalLogs).toContain('Available commands:');
    });

    it('fails to exploit without scan', () => {
      useGameStore.getState().submitHackingCommand('exploit');
      const state = useGameStore.getState();
      expect(state.terminalLogs.some(l => l.includes('Error: Exploit failed'))).toBe(true);
    });

    it('denies flag read before exploit', () => {
      useGameStore.getState().submitHackingCommand('cat flag.txt');
      const state = useGameStore.getState();
      expect(state.terminalLogs.some(l => l.includes('Permission denied'))).toBe(true);
    });

    it('completes head-to-head CTF challenge via scan -> exploit -> cat flag.txt', () => {
      const store = useGameStore.getState();
      store.submitHackingCommand('scan');
      store.submitHackingCommand('exploit');
      store.submitHackingCommand('cat flag.txt');

      const state = useGameStore.getState();
      expect(state.terminalChallengeSolved).toBe(true);
      expect(state.matchScore).toBe(100);
      expect(state.earnedTokens).toBe(0.30);
      expect(state.modelStats.securityDefense).toBeGreaterThan(91.50); // starts at 91.50
      expect(state.terminalLogs.some(l => l.includes('FLAG: BLND_ARENA_PWN_SUCCESS'))).toBe(true);
    });
  });

  describe('Shared Actions', () => {
    it('advances to next round resetting round states', () => {
      useGameStore.setState({ gameMode: 'the_judge', currentPromptIndex: 0, matchScore: 100 });
      useGameStore.getState().nextRound();

      const state = useGameStore.getState();
      expect(state.currentPromptIndex).toBe(1);
      expect(state.matchScore).toBeNull();
    });
  });
});

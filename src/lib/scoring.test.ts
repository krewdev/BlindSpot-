import { describe, it, expect } from 'vitest';
import { calculateIoU, scoreMatch } from './scoring';
import { Box } from './types';

describe('calculateIoU', () => {
  it('calculates IoU of completely overlapping boxes', () => {
    const boxA: Box = { id: '1', x: 10, y: 10, width: 100, height: 100, className: 'person' };
    const boxB: Box = { id: '2', x: 10, y: 10, width: 100, height: 100, className: 'person' };
    expect(calculateIoU(boxA, boxB)).toBe(1);
  });

  it('calculates IoU of non-overlapping boxes', () => {
    const boxA: Box = { id: '1', x: 10, y: 10, width: 50, height: 50, className: 'person' };
    const boxB: Box = { id: '2', x: 100, y: 100, width: 50, height: 50, className: 'person' };
    expect(calculateIoU(boxA, boxB)).toBe(0);
  });

  it('calculates IoU of partially overlapping boxes', () => {
    const boxA: Box = { id: '1', x: 0, y: 0, width: 10, height: 10, className: 'person' };
    const boxB: Box = { id: '2', x: 5, y: 0, width: 10, height: 10, className: 'person' };
    // Intersection = 5 * 10 = 50
    // Union = 100 + 100 - 50 = 150
    // IoU = 50 / 150 = 1/3 ~ 0.3333
    expect(calculateIoU(boxA, boxB)).toBeCloseTo(0.333, 3);
  });
});

describe('scoreMatch', () => {
  it('returns score of 100 when both lists of boxes are empty', () => {
    const result = scoreMatch([], []);
    expect(result.overallScore).toBe(100);
    expect(result.matches).toHaveLength(0);
    expect(result.missedCount).toBe(0);
    expect(result.extraCount).toBe(0);
  });

  it('returns score of 0 when one list of boxes is empty', () => {
    const box: Box = { id: '1', x: 0, y: 0, width: 10, height: 10, className: 'person' };
    const result = scoreMatch([box], []);
    expect(result.overallScore).toBe(0);
    expect(result.missedCount).toBe(1);
    expect(result.extraCount).toBe(0);
  });

  it('matches matching classes above IoU threshold', () => {
    const aiBoxes: Box[] = [
      { id: 'ai-1', x: 0, y: 0, width: 10, height: 10, className: 'person' }
    ];
    const playerBoxes: Box[] = [
      { id: 'p-1', x: 2, y: 0, width: 10, height: 10, className: 'person' }
    ];
    // Intersection = 8 * 10 = 80
    // Union = 100 + 100 - 80 = 120
    // IoU = 80 / 120 = 2/3 ~ 0.67
    const result = scoreMatch(aiBoxes, playerBoxes);
    expect(result.overallScore).toBe(67);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].iou).toBeCloseTo(0.67, 2);
    expect(result.missedCount).toBe(0);
    expect(result.extraCount).toBe(0);
  });

  it('ignores matches of different classes', () => {
    const aiBoxes: Box[] = [
      { id: 'ai-1', x: 0, y: 0, width: 10, height: 10, className: 'person' }
    ];
    const playerBoxes: Box[] = [
      { id: 'p-1', x: 0, y: 0, width: 10, height: 10, className: 'car' }
    ];
    const result = scoreMatch(aiBoxes, playerBoxes);
    expect(result.overallScore).toBe(0);
    expect(result.matches).toHaveLength(0);
    expect(result.missedCount).toBe(1);
    expect(result.extraCount).toBe(1);
  });

  it('penalizes extra and missed boxes in the overall score', () => {
    const aiBoxes: Box[] = [
      { id: 'ai-1', x: 0, y: 0, width: 10, height: 10, className: 'person' },
      { id: 'ai-2', x: 50, y: 50, width: 10, height: 10, className: 'car' }
    ];
    const playerBoxes: Box[] = [
      { id: 'p-1', x: 0, y: 0, width: 10, height: 10, className: 'person' }
    ];
    const result = scoreMatch(aiBoxes, playerBoxes);
    // 1 perfect match (IoU = 1), 1 missed box (ai-2).
    // Total count = max(2, 1) = 2.
    // Score = (1 / 2) * 100 = 50.
    expect(result.overallScore).toBe(50);
    expect(result.missedCount).toBe(1);
    expect(result.extraCount).toBe(0);
  });
});

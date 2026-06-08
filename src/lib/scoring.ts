import { Box } from './types';

/**
 * Calculates the Intersection over Union (IoU) of two bounding boxes.
 */
export function calculateIoU(a: Box, b: Box): number {
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.width, b.x + b.width);
  const yB = Math.min(a.y + a.height, b.y + b.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  if (interArea === 0) return 0;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const unionArea = areaA + areaB - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Compares two sets of bounding boxes and calculates agreement scores.
 * Matches bounding boxes of the same class based on highest IoU.
 */
export function scoreMatch(
  phantomBoxes: Box[],
  seekerBoxes: Box[]
): {
  overallScore: number;
  matches: { phantom: Box; seeker: Box; iou: number }[];
  missedCount: number;
  extraCount: number;
} {
  if (phantomBoxes.length === 0 && seekerBoxes.length === 0) {
    return { overallScore: 100, matches: [], missedCount: 0, extraCount: 0 };
  }
  if (phantomBoxes.length === 0 || seekerBoxes.length === 0) {
    return {
      overallScore: 0,
      matches: [],
      missedCount: phantomBoxes.length,
      extraCount: seekerBoxes.length,
    };
  }

  let totalIoU = 0;
  const matches: { phantom: Box; seeker: Box; iou: number }[] = [];
  const matchedSeekerIndices = new Set<number>();

  for (const pBox of phantomBoxes) {
    let bestIoU = 0;
    let bestIdx = -1;

    for (let i = 0; i < seekerBoxes.length; i++) {
      if (matchedSeekerIndices.has(i)) continue;
      const sBox = seekerBoxes[i];
      if (pBox.className !== sBox.className) continue;

      const iou = calculateIoU(pBox, sBox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestIdx = i;
      }
    }

    // A threshold of 0.3 is used to establish basic overlap match
    if (bestIdx !== -1 && bestIoU >= 0.3) {
      matchedSeekerIndices.add(bestIdx);
      totalIoU += bestIoU;
      matches.push({
        phantom: pBox,
        seeker: seekerBoxes[bestIdx],
        iou: bestIoU,
      });
    }
  }

  const missedCount = phantomBoxes.length - matches.length;
  const extraCount = seekerBoxes.length - matches.length;

  // overallScore is average IoU scaled by the maximum number of boxes (penalizes mismatches, extras, and misses)
  const totalCount = Math.max(phantomBoxes.length, seekerBoxes.length);
  const overallScore = Math.round((totalIoU / totalCount) * 100);

  return { overallScore, matches, missedCount, extraCount };
}

/**
 * Calculates a bag-of-words cosine similarity score (0 to 1) between two captions.
 * Cleans punctuation, splits into words, ignores words <= 2 characters, and compares frequency vectors.
 */
export function calculateCosineSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  
  const clean = (text: string) =>
    text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2);

  const wordsA = clean(textA);
  const wordsB = clean(textB);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};

  wordsA.forEach(w => freqA[w] = (freqA[w] || 0) + 1);
  wordsB.forEach(w => freqB[w] = (freqB[w] || 0) + 1);

  const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  allWords.forEach(w => {
    const valA = freqA[w] || 0;
    const valB = freqB[w] || 0;
    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  });

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

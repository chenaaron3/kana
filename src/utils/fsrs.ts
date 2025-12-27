import { createEmptyCard, fsrs } from 'ts-fsrs';

import type { Grade } from "ts-fsrs";

import type { KanaCharacter } from "~/data/kana";
import type { KanaCard } from "~/types/progress";

// Configure FSRS for kana learning with shorter intervals
// Learning steps: multiple short intervals to keep cards in Learning state longer
// This prevents day-long due dates until cards are well-learned
const scheduler = fsrs({
  // Short learning steps - review within minutes/hours, not days
  // Cards must pass through all steps before entering Review state
  learning_steps: ["1m", "5m", "15m", "1h", "4h"],

  // Short relearning steps for forgotten cards
  relearning_steps: ["5m", "15m"],

  // Keep short-term learning enabled (required for learning steps to work)
  enable_short_term: true,

  // Reasonable max interval (90 days) instead of default 36500 days
  maximum_interval: 90,

  // High retention rate for language learning
  request_retention: 0.9,

  // Disable fuzz for more predictable intervals
  enable_fuzz: false,
});

export function initializeKanaCard(kanaId: string): KanaCard {
  return {
    card: createEmptyCard(),
    kanaId,
  };
}

/**
 * Calculate weight for probability-based selection using two factors.
 * Higher weight = higher probability of being selected.
 *
 * Combines:
 * - Retrievability (lower = closer to forgetting, higher priority)
 * - Accuracy (lower accuracy = higher weight, needs more practice)
 *   - Total shown is used as a confidence factor:
 *     - High accuracy + high total shown = lower weight (high confidence mastered)
 *     - Low accuracy + high total shown = higher weight (high confidence difficult)
 * - New cards: competitive weight to ensure exposure
 */
function calculateWeight(
  kanaCard: KanaCard | null,
  now: Date = new Date()
): number {
  if (!kanaCard) {
    // New card - competitive weight to ensure they get exposure
    return 3.0;
  }

  const fsrsCard = kanaCard.card;

  // Factor 1: Retrievability (lower = closer to forgetting, higher priority)
  // Use FSRS's retrievability calculation
  let retrievabilityWeight = 1.0;
  try {
    const retrievability = scheduler.get_retrievability(fsrsCard, now, false);
    // Lower retrievability (closer to forgetting) = higher weight
    // Invert: weight = 1 / (retrievability + 0.1)
    // Retrievability 0.1 → weight 10, Retrievability 0.9 → weight 1.0
    retrievabilityWeight = 1 / (retrievability + 0.1);
  } catch {
    // Fallback if retrievability calculation fails
    retrievabilityWeight = 1.0;
  }

  // Factor 2: Accuracy with confidence based on total shown
  // Calculate accuracy from totalShown and totalCorrect
  const totalShown = kanaCard.totalShown ?? 0;
  const totalCorrect = kanaCard.totalCorrect ?? 0;
  let accuracyWeight = 1.0;

  if (totalShown > 0) {
    const accuracy = totalCorrect / totalShown;
    // Base accuracy weight: lower accuracy = higher weight
    // Invert: weight = 1 / (accuracy + 0.1)
    // Accuracy 0.0 (0%) → weight 10.0, Accuracy 0.5 (50%) → weight 1.67, Accuracy 1.0 (100%) → weight 0.91
    const baseAccuracyWeight = 1 / (accuracy + 0.1);

    // Confidence factor based on total shown (caps at 1.0 when totalShown >= 10)
    // More reviews = higher confidence in the accuracy measurement
    const confidenceFactor = Math.min(totalShown / 10, 1.0);

    // Apply confidence adjustment:
    // - High accuracy (> 0.7): More total shown = higher confidence it's mastered → reduce weight
    // - Low accuracy (< 0.5): More total shown = higher confidence it's difficult → increase weight
    // - Neutral accuracy (0.5-0.7): Minimal adjustment
    if (accuracy > 0.7) {
      // High accuracy: reduce weight as confidence increases
      // Formula: baseWeight * (1 - confidenceFactor * 0.3)
      // At max confidence (1.0): reduces weight by 30%
      accuracyWeight = baseAccuracyWeight * (1 - confidenceFactor * 0.3);
    } else if (accuracy < 0.5) {
      // Low accuracy: increase weight as confidence increases
      // Formula: baseWeight * (1 + confidenceFactor * 0.5)
      // At max confidence (1.0): increases weight by 50%
      accuracyWeight = baseAccuracyWeight * (1 + confidenceFactor * 0.5);
    } else {
      // Neutral accuracy: slight increase to ensure practice
      accuracyWeight = baseAccuracyWeight * (1 + confidenceFactor * 0.1);
    }
  } else {
    // New card (no reviews yet) - neutral weight
    accuracyWeight = 1.0;
  }

  // Combine with 50/50 split
  return retrievabilityWeight * 0.5 + accuracyWeight * 0.5;
}

export function getNextKana(
  availableKana: KanaCharacter[],
  kanaCards: Record<string, KanaCard>,
  now: Date = new Date()
): KanaCharacter | null {
  if (availableKana.length === 0) return null;

  // Separate cards into categories for balanced selection
  const newCards: Array<{ kana: KanaCharacter; weight: number }> = [];
  const otherCards: Array<{ kana: KanaCharacter; weight: number }> = [];

  for (const kana of availableKana) {
    const kanaCard = kanaCards[kana.id] ?? null;
    const weight = calculateWeight(kanaCard, now);

    // Check if it's a new card (never reviewed)
    if (!kanaCard) {
      newCards.push({ kana, weight });
      continue;
    }

    otherCards.push({ kana, weight });
  }

  // Hybrid approach: Mix new cards (30%) with other cards (70%) when both exist
  // This ensures new cards always get some exposure while weights handle prioritization
  let cardsToSelectFrom: Array<{ kana: KanaCharacter; weight: number }>;

  if (newCards.length > 0 && otherCards.length > 0) {
    // Both new and other cards exist - mix them 50% new, 50% other
    const useNewCardPool = Math.random() < 0.5;
    cardsToSelectFrom = useNewCardPool ? newCards : otherCards;
  } else if (otherCards.length > 0) {
    // Only other cards exist
    cardsToSelectFrom = otherCards;
  } else if (newCards.length > 0) {
    // Only new cards exist
    cardsToSelectFrom = newCards;
  } else {
    // Fallback (shouldn't happen)
    cardsToSelectFrom = [];
  }

  // Calculate total weight for normalization
  const totalWeight = cardsToSelectFrom.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  if (totalWeight === 0) {
    // Fallback: equal probability for all
    const randomIndex = Math.floor(Math.random() * availableKana.length);
    return availableKana[randomIndex]!;
  }

  // Weighted random selection using binary search for better performance
  // Build cumulative weights array
  const cumulativeWeights: number[] = [];
  let cumulative = 0;
  for (const item of cardsToSelectFrom) {
    cumulative += item.weight;
    cumulativeWeights.push(cumulative);
  }

  // Binary search for O(log n) selection
  const random = Math.random() * totalWeight;
  let left = 0;
  let right = cumulativeWeights.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (cumulativeWeights[mid]! < random) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return cardsToSelectFrom[left]!.kana;
}

/**
 * Classifies the performance history of a card into positive, neutral, or negative.
 * @param kanaCard - The kana card to evaluate
 * @returns 'positive' | 'neutral' | 'negative'
 */
function getPerformanceHistory(
  kanaCard: KanaCard
): "positive" | "neutral" | "negative" {
  const totalShown = kanaCard.totalShown ?? 0;
  const totalCorrect = kanaCard.totalCorrect ?? 0;

  // Not enough data to determine performance
  if (totalShown < 3) {
    return "neutral";
  }

  const accuracy = totalCorrect / totalShown;

  // Positive: high accuracy (≥80%)
  if (accuracy >= 0.8) {
    return "positive";
  }

  // Negative: low accuracy (<50%)
  if (accuracy < 0.5) {
    return "negative";
  }

  // Neutral: moderate accuracy (50-79%)
  return "neutral";
}

export function reviewKana(
  kanaCard: KanaCard,
  isCorrect: boolean,
  now: Date = new Date()
): KanaCard {
  let grade: Grade;

  if (isCorrect) {
    // Correct answers: select grade based on performance history
    const performance = getPerformanceHistory(kanaCard);
    switch (performance) {
      case "positive":
        grade = 4; // Easy - doing well with this card
        break;
      case "negative":
        grade = 2; // Hard - correct but struggling overall
        break;
      case "neutral":
      default:
        grade = 3; // Good - neutral/default
        break;
    }
  } else {
    // Wrong answers: always Grade 1 (Again)
    grade = 1;
  }

  const result = scheduler.repeat(kanaCard.card, now);
  const newCard = result[grade]?.card;
  if (!newCard) {
    throw new Error(`Failed to get card for grade ${grade}`);
  }

  // Track total shown and correct counts
  const totalShown = (kanaCard.totalShown ?? 0) + 1;
  const totalCorrect = (kanaCard.totalCorrect ?? 0) + (isCorrect ? 1 : 0);

  return {
    ...kanaCard,
    card: newCard,
    lastReview: now.getTime(),
    totalShown,
    totalCorrect,
  };
}

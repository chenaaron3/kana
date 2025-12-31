import hiraganaWords from "~/data/hiragana.json";
import katakanaWords from "~/data/katakana.json";

import type { KanaCharacter } from "~/data/kana";
import type { EnemyStats, KanaCard } from "~/types/progress";

/**
 * Generate a new enemy with random stats
 */
export function generateNewEnemy(): EnemyStats {
  return {
    health: Math.floor(Math.random() * 6) + 5, // 5-10
    attack: Math.floor(Math.random() * 3) + 2, // 2-4
  };
}

/**
 * Get translation for a word (hiragana or katakana)
 */
export function getTranslation(wordKana: KanaCharacter[]): string | undefined {
  const wordString = wordKana.map((k) => k.character).join("");

  // Check hiragana words
  if (wordString in hiraganaWords) {
    return (hiraganaWords as Record<string, string>)[wordString];
  }

  // Check katakana words
  if (wordString in katakanaWords) {
    return (katakanaWords as Record<string, string>)[wordString];
  }

  return undefined;
}

/**
 * Get bottom N kana by accuracy (lowest accuracy = hardest)
 */
export function getBottomKanaByAccuracy(
  kanaList: KanaCharacter[],
  cards: Record<string, KanaCard>,
  count: number = 10
): KanaCharacter[] {
  // Calculate accuracy for each kana
  const kanaWithAccuracy = kanaList.map((kana) => {
    const card = cards[kana.id];
    const totalShown = card?.totalShown ?? 0;
    const totalCorrect = card?.totalCorrect ?? 0;
    // Calculate accuracy (0.0 to 1.0), default to 0.0 for new kana
    const accuracy = totalShown > 0 ? totalCorrect / totalShown : 0.0;
    return { kana, accuracy };
  });

  // Sort by accuracy (lowest first = hardest)
  kanaWithAccuracy.sort((a, b) => a.accuracy - b.accuracy);

  // Take bottom N (or all if less than N)
  const bottomKana = kanaWithAccuracy
    .slice(0, Math.min(count, kanaWithAccuracy.length))
    .map((item) => item.kana);

  return bottomKana;
}

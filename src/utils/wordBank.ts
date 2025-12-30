import hiraganaWords from "~/data/hiragana.json";
import { allKanaCharacters } from "~/data/kana";
import katakanaWords from "~/data/katakana.json";

import { calculateWeight } from "./fsrs";

import type { KanaCharacter } from "~/data/kana";
import type { KanaCard } from "~/types/progress";

// Cache for available words to avoid recalculating
let cachedAvailableKanaIds: string[] = [];
let cachedAvailableWords: {
  hiragana: KanaCharacter[][];
  katakana: KanaCharacter[][];
} = {
  hiragana: [],
  katakana: [],
};

// Create a map for faster lookup
const kanaCharacterMap = new Map<string, KanaCharacter>();
allKanaCharacters.forEach((k) => {
  kanaCharacterMap.set(k.character, k);
});

// Pre-process all words at build time into KanaCharacter[][] arrays
const ALL_HIRAGANA_WORDS: KanaCharacter[][] = Object.keys(hiraganaWords)
  .map((word) => splitWordIntoKana(word))
  .filter((wordKana) => wordKana.length > 0);

const ALL_KATAKANA_WORDS: KanaCharacter[][] = Object.keys(katakanaWords)
  .map((word) => splitWordIntoKana(word))
  .filter((wordKana) => wordKana.length > 0);

/**
 * Split a Japanese word into individual kana characters.
 * Handles combinations (きゃ, しゅ, etc.) by matching longest combinations first.
 * Returns KanaCharacter objects (skips characters not in the database like っ).
 */
export function splitWordIntoKana(word: string): KanaCharacter[] {
  const result: KanaCharacter[] = [];
  let i = 0;

  // Get all kana characters strings sorted by length (longest first) for greedy matching
  const allKanaStrings = Array.from(kanaCharacterMap.keys()).sort(
    (a, b) => b.length - a.length
  );

  while (i < word.length) {
    let matched = false;

    // Try to match longest kana first
    for (const kanaStr of allKanaStrings) {
      if (word.substring(i, i + kanaStr.length) === kanaStr) {
        const kanaChar = kanaCharacterMap.get(kanaStr);
        if (kanaChar) {
          result.push(kanaChar);
        }
        i += kanaStr.length;
        matched = true;
        break;
      }
    }

    // If no match found (e.g. small tsu っ, or rare chars), skip it
    if (!matched) {
      i++;
    }
  }

  return result;
}

/**
 * Check if a word (as KanaCharacter[]) can be formed from available kana characters.
 * Note: っ (small tsu) and other modifiers may not be in availableKana,
 * but words containing them are still valid if all other characters match.
 */
export function canFormWord(
  wordKana: KanaCharacter[],
  availableKana: KanaCharacter[]
): boolean {
  const availableChars = new Set(availableKana.map((k) => k.character));

  for (const kana of wordKana) {
    // Skip small tsu (っ) and other modifiers that might not be selectable
    // These are valid in words even if not explicitly selected
    if (kana.character === "っ" || kana.character === "ッ") {
      continue;
    }

    // Check if the character exists in the available set
    if (!availableChars.has(kana.character)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter words from word banks based on available kana.
 * Returns separate arrays for hiragana and katakana words as KanaCharacter arrays.
 */
export function getAvailableWords(availableKana: KanaCharacter[]): {
  hiragana: KanaCharacter[][];
  katakana: KanaCharacter[][];
} {
  // Check if we can use cache
  const currentKanaIds = availableKana
    .map((k) => k.id)
    .sort()
    .join(",");
  if (
    cachedAvailableKanaIds.length === availableKana.length &&
    cachedAvailableKanaIds.join(",") === currentKanaIds
  ) {
    return cachedAvailableWords;
  }

  // Filter from pre-processed word arrays
  const hiraganaWordsList = ALL_HIRAGANA_WORDS.filter((wordKana) =>
    canFormWord(wordKana, availableKana)
  );

  const katakanaWordsList = ALL_KATAKANA_WORDS.filter((wordKana) =>
    canFormWord(wordKana, availableKana)
  );

  // Update cache
  cachedAvailableKanaIds = availableKana.map((k) => k.id).sort();
  cachedAvailableWords = {
    hiragana: hiraganaWordsList,
    katakana: katakanaWordsList,
  };

  return cachedAvailableWords;
}

/**
 * Calculate the weight of a word based on the average weight of its constituent kana.
 */
export function calculateWordWeight(
  wordKana: KanaCharacter[],
  availableKana: KanaCharacter[],
  kanaCards: Record<string, KanaCard>,
  now: Date = new Date()
): number {
  const weights: number[] = [];

  for (const kanaChar of wordKana) {
    // Skip small tsu and other modifiers
    if (kanaChar.character === "っ" || kanaChar.character === "ッ") {
      continue;
    }

    const kana = availableKana.find((k) => k.character === kanaChar.character);
    if (kana) {
      const card = kanaCards[kana.id];
      const weight = calculateWeight(card ?? null, now);
      weights.push(weight);
    }
  }

  if (weights.length === 0) {
    return 0;
  }

  // Return average weight
  return weights.reduce((sum, w) => sum + w, 0) / weights.length;
}

/**
 * Get the ratio of hiragana to katakana in available kana.
 */
export function getWordBankRatio(availableKana: KanaCharacter[]): {
  hiragana: number;
  katakana: number;
} {
  const hiraganaCount = availableKana.filter(
    (k) => k.type === "hiragana"
  ).length;
  const katakanaCount = availableKana.filter(
    (k) => k.type === "katakana"
  ).length;
  const total = hiraganaCount + katakanaCount;

  return {
    hiragana: total > 0 ? hiraganaCount / total : 0,
    katakana: total > 0 ? katakanaCount / total : 0,
  };
}

/**
 * Check if a word contains at least one new kana (kana without a card).
 */
function hasNewKana(
  wordKana: KanaCharacter[],
  availableKana: KanaCharacter[],
  kanaCards: Record<string, KanaCard>
): boolean {
  for (const kanaChar of wordKana) {
    // Skip small tsu and other modifiers
    if (kanaChar.character === "っ" || kanaChar.character === "ッ") {
      continue;
    }

    const kana = availableKana.find((k) => k.character === kanaChar.character);
    if (kana) {
      // Check if this kana is new (no card exists)
      if (!kanaCards[kana.id]) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a word contains at least one overdue kana (kana with a card that is overdue).
 */
function hasOverdueKana(
  wordKana: KanaCharacter[],
  kanaCards: Record<string, KanaCard>,
  now: Date
): boolean {
  const nowTime = now.getTime();
  return wordKana.some((kanaChar) => {
    // Skip small tsu and other modifiers
    if (kanaChar.character === "っ" || kanaChar.character === "ッ") {
      return false;
    }

    const card = kanaCards[kanaChar.id];
    if (!card?.card.due) {
      return false;
    }

    // Normalize due date to timestamp for comparison
    // Handle Date objects, strings, and numbers (timestamps)
    const dueTime =
      card.card.due instanceof Date
        ? card.card.due.getTime()
        : typeof card.card.due === "string"
          ? new Date(card.card.due).getTime()
          : card.card.due;

    // Check if overdue (due time is in the past)
    return dueTime < nowTime;
  });
}

/**
 * Get the next word to use in the quiz, using weighted selection.
 * Returns null if < 100 words are available (fallback to individual kana).
 * Balances new vs existing kana similar to getNextKana.
 */
export function getNextWord(
  availableKana: KanaCharacter[],
  kanaCards: Record<string, KanaCard>,
  maxCharacters: number = 2
): KanaCharacter[] | null {
  const now = new Date();
  const availableWords = getAvailableWords(availableKana);
  const filteredHiragana = availableWords.hiragana.filter(
    (word) => word.length <= maxCharacters
  );
  const filteredKatakana = availableWords.katakana.filter(
    (word) => word.length <= maxCharacters
  );
  const totalWords = filteredHiragana.length + filteredKatakana.length;

  // Check threshold: need at least 100 words
  if (totalWords < 100) {
    return null;
  }

  // Calculate ratio for hiragana/katakana selection
  const ratio = getWordBankRatio(availableKana);
  const useHiragana = Math.random() < ratio.hiragana;

  // Select word bank based on ratio
  let wordsToSelectFrom: KanaCharacter[][] = [];
  if (useHiragana && filteredHiragana.length > 0) {
    wordsToSelectFrom = filteredHiragana;
    console.log("using hiragana");
  } else if (availableWords.katakana.length > 0) {
    wordsToSelectFrom = filteredKatakana;
    console.log("using katakana");
  } else if (filteredHiragana.length > 0) {
    // Fallback to hiragana if katakana is empty
    wordsToSelectFrom = filteredHiragana;
    console.log("using hiragana fallback");
  } else {
    console.log("no words available");
    return null;
  }

  // Separate words into categories for balanced selection (similar to getNextKana)
  const wordsWithNewKana: Array<{ word: KanaCharacter[]; weight: number }> = [];
  const wordsWithOverdueKana: Array<{
    word: KanaCharacter[];
    weight: number;
  }> = [];
  const allWords: Array<{
    word: KanaCharacter[];
    weight: number;
  }> = [];

  // Calculate weights and categorize words
  // Words can be in multiple categories (e.g., both new and overdue)
  for (const wordKana of wordsToSelectFrom) {
    const weight = calculateWordWeight(wordKana, availableKana, kanaCards, now);
    if (weight > 0) {
      if (hasNewKana(wordKana, availableKana, kanaCards)) {
        wordsWithNewKana.push({ word: wordKana, weight });
      }
      if (hasOverdueKana(wordKana, kanaCards, now)) {
        wordsWithOverdueKana.push({ word: wordKana, weight });
      }
      allWords.push({ word: wordKana, weight });
    }
  }

  // Selection strategy: 1/3 chance for each bucket (new/overdue/all)
  // If new or overdue are empty, they fall back to all
  const bucketRandom = Math.random();
  let weightedWords: Array<{ word: KanaCharacter[]; weight: number }>;

  if (bucketRandom < 1 / 3) {
    // 1/3 chance: new kana (fallback to all if empty)
    weightedWords = wordsWithNewKana.length > 0 ? wordsWithNewKana : allWords;
    console.log("using new kana");
  } else if (bucketRandom < 2 / 3) {
    // 1/3 chance: overdue kana (fallback to all if empty)
    weightedWords =
      wordsWithOverdueKana.length > 0 ? wordsWithOverdueKana : allWords;
    console.log("using overdue kana");
  } else {
    // 1/3 chance: all words
    weightedWords = allWords;
    console.log("using all words");
  }

  if (weightedWords.length === 0) {
    return null;
  }

  // Calculate total weight
  const totalWeight = weightedWords.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    // Fallback: equal probability for all
    const randomIndex = Math.floor(Math.random() * weightedWords.length);
    return weightedWords[randomIndex]!.word;
  }

  // Weighted random selection using binary search
  const cumulativeWeights: number[] = [];
  let cumulative = 0;
  for (const item of weightedWords) {
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

  return weightedWords[left]!.word;
}

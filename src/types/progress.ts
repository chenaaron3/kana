import type { Card } from "ts-fsrs";
import type { KanaCharacter } from "~/data/kana";

export interface UserProgress {
  kanaCards: Record<string, KanaCard>;
}

export interface KanaCard {
  card: Card;
  kanaId: string;
  lastReview?: number; // timestamp
  totalShown?: number; // Total number of times this kana was shown
  totalCorrect?: number; // Total number of times this kana was answered correctly
}

export interface EnemyStats {
  health: number; // 5-20
  attack: number; // Number of attack attempts before enemy attacks
  defense: number; // Fixed length for defense prompt
}

export interface Session {
  uuid: string;
  selectedKanaIds: string[];
  enemiesDefeated: number; // Tracks how many enemies defeated (determines attack prompt length)
  totalCorrect: number; // Total number of correct characters answered
  totalAttempts: number; // Total number of character attempts
}

export interface PreviousAnswer {
  kana: KanaCharacter[]; // All characters in the current prompt
  userInput: string; // The user's entire input
  isCorrect: boolean; // Whether all answers were correct
  translation?: string; // English translation (for words)
}

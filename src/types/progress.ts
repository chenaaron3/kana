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

export interface Session {
  uuid: string;
  level: number;
  selectedKanaIds: string[];
  levelProgress: number; // 0-10, how many points toward next level
  totalCorrect: number; // Total number of correct characters answered
  totalAttempts: number; // Total number of character attempts
}

export interface PreviousAnswer {
  kana: KanaCharacter[]; // All characters in the current prompt
  userInput: string; // The user's entire input
  isCorrect: boolean; // Whether all answers were correct
}

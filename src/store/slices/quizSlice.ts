import type { StateCreator } from "zustand";
import type { KanaCharacter } from "~/data/kana";
import type { PreviousAnswer } from "~/types/progress";

export interface QuizState {
  // Prompt state
  currentPrompt: KanaCharacter[];
  currentWordString: string | null;
  promptType: "attack" | "defense";
  // Answer state
  previousAnswer: PreviousAnswer | null;
  // UI state
  userInput: string;
}

export interface QuizActions {
  // Prompt actions
  setCurrentPrompt: (prompt: KanaCharacter[]) => void;
  setCurrentWordString: (wordString: string | null) => void;
  setPromptType: (type: "attack" | "defense") => void;
  // Answer actions
  setPreviousAnswer: (answer: PreviousAnswer | null) => void;
  clearPreviousAnswer: () => void;
  // UI actions
  setUserInput: (input: string) => void;
  clearUserInput: () => void;
}

export type QuizSlice = QuizState & QuizActions;

export const createQuizSlice = (): StateCreator<QuizSlice> => (set) => ({
  // Initial state
  currentPrompt: [],
  currentWordString: null,
  promptType: "attack",
  previousAnswer: null,
  userInput: "",

  // Actions
  setCurrentPrompt: (prompt) => {
    set({ currentPrompt: prompt });
  },
  setCurrentWordString: (wordString) => {
    set({ currentWordString: wordString });
  },
  setPromptType: (type) => {
    set({ promptType: type });
  },
  setPreviousAnswer: (answer) => {
    set({ previousAnswer: answer });
  },
  clearPreviousAnswer: () => {
    set({ previousAnswer: null });
  },
  setUserInput: (input) => {
    set({ userInput: input });
  },
  clearUserInput: () => {
    set({ userInput: "" });
  },
});

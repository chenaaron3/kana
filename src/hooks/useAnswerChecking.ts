import { useEffect } from "react";
import { initializeKanaCard, reviewKana } from "~/utils/fsrs";
import { getTranslation } from "~/utils/promptUtils";

import type { GameStoreHook } from "~/store/gameStore";
import type { KanaCard } from "~/types/progress";

interface UseAnswerCheckingProps {
  kanaCards: Record<string, KanaCard>;
  updateKanaCards: (updates: Record<string, KanaCard>) => void;
  useStore: GameStoreHook;
}

export function useAnswerChecking({
  kanaCards,
  updateKanaCards,
  useStore,
}: UseAnswerCheckingProps) {
  // Get state from store
  const currentPrompt = useStore((state) => state.currentPrompt);
  const currentWordString = useStore((state) => state.currentWordString);
  const sessionState = useStore((state) => state.sessionState);

  // Get actions from store (using getState to avoid re-renders)
  const setPreviousAnswer = useStore.getState().setPreviousAnswer;
  const updateSession = useStore.getState().updateSession;

  // Clear previousAnswer when selectedKanaIds changes
  useEffect(() => {
    const clearPreviousAnswer = useStore.getState().clearPreviousAnswer;
    clearPreviousAnswer();
  }, [sessionState.selectedKanaIds, useStore]);

  // Validate input and return match details for each kana
  const validateInputWithDetails = (
    input: string
  ): { allCorrect: boolean; matches: boolean[] } => {
    if (currentPrompt.length === 0) return { allCorrect: false, matches: [] };

    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return { allCorrect: false, matches: [] };

    let inputIndex = 0;
    const matches: boolean[] = [];

    // Check each kana by trying to match its romaji from current input position
    for (const kana of currentPrompt) {
      const sortedRomaji = [...kana.romaji]
        .map((r) => r.toLowerCase())
        .sort((a, b) => b.length - a.length);

      const escapedRomaji = sortedRomaji.map((r) =>
        r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );

      const pattern = new RegExp(`^(${escapedRomaji.join("|")})`, "i");
      const remainingInput = normalizedInput.substring(inputIndex);
      const match = remainingInput.match(pattern);

      if (match) {
        matches.push(true);
        inputIndex += match[1]!.length;
      } else {
        matches.push(false);
        // Advance input index even for incorrect matches
        const maxRomajiLength = Math.max(...kana.romaji.map((r) => r.length));
        const endIndex = Math.min(
          inputIndex + maxRomajiLength,
          normalizedInput.length
        );
        inputIndex += Math.max(1, endIndex - inputIndex);
      }
    }

    // All kana matched and we've consumed all input
    const allCorrect =
      matches.every((m) => m) && inputIndex === normalizedInput.length;
    return { allCorrect, matches };
  };

  // Validate input without side effects (for real-time checking)
  const validateInput = (input: string): boolean => {
    return validateInputWithDetails(input).allCorrect;
  };

  const checkAnswers = (
    input: string,
    onResult: (result: { allCorrect: boolean; correctCount: number }) => void
  ) => {
    if (currentPrompt.length === 0) return;

    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return;

    // Use validateInputWithDetails to get match information
    const { allCorrect, matches } = validateInputWithDetails(input);
    const correctCount = matches.filter((m) => m).length;

    const updatedKanaCards: Record<string, KanaCard> = {};

    // Update FSRS cards for each kana based on match results
    currentPrompt.forEach((kana, index) => {
      const isCorrect = matches[index] ?? false;

      // Update FSRS card
      let kanaCard = kanaCards[kana.id];
      kanaCard ??= initializeKanaCard(kana.id);
      const updatedCard = reviewKana(kanaCard, isCorrect);
      updatedKanaCards[kana.id] = updatedCard;
    });

    // Update accuracy tracking
    const newTotalCorrect = sessionState.totalCorrect + correctCount;
    const newTotalAttempts = sessionState.totalAttempts + currentPrompt.length;

    // Get translation if this was a word
    const translation = currentWordString
      ? getTranslation(currentPrompt)
      : undefined;

    // Store the previous answer
    setPreviousAnswer({
      kana: currentPrompt,
      userInput: input,
      isCorrect: allCorrect,
      translation,
    });

    // Update kanaCards state and save to persistent storage
    updateKanaCards(updatedKanaCards);

    // Update session state
    updateSession({
      totalCorrect: newTotalCorrect,
      totalAttempts: newTotalAttempts,
    });

    // Call the result callback
    onResult({ allCorrect, correctCount });
  };

  return {
    checkAnswers,
    validateInput,
  };
}

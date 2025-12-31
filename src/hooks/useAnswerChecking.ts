import { useEffect, useState } from "react";
import { initializeKanaCard, reviewKana } from "~/utils/fsrs";
import { getTranslation } from "~/utils/promptUtils";

import type { KanaCharacter } from "~/data/kana";
import type { KanaCard, PreviousAnswer, Session } from "~/types/progress";

interface UseAnswerCheckingProps {
  kanaCards: Record<string, KanaCard>;
  currentPrompt: KanaCharacter[];
  currentWordString: string | null;
  sessionState: Session;
  updateKanaCards: (updates: Record<string, KanaCard>) => void;
  setSessionState: React.Dispatch<React.SetStateAction<Session>>;
  selectedKanaIds: string[];
}

export function useAnswerChecking({
  kanaCards,
  currentPrompt,
  currentWordString,
  sessionState,
  updateKanaCards,
  setSessionState,
  selectedKanaIds,
}: UseAnswerCheckingProps) {
  const [previousAnswer, setPreviousAnswer] = useState<PreviousAnswer | null>(
    null
  );

  // Clear previousAnswer only when selectedKanaIds changes
  useEffect(() => {
    setPreviousAnswer(null);
  }, [selectedKanaIds]);

  const checkAnswers = (
    input: string,
    onResult: (result: { allCorrect: boolean; correctCount: number }) => void
  ) => {
    if (currentPrompt.length === 0) return;

    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return;

    let allCorrect = true;
    let correctCount = 0;
    const updatedKanaCards: Record<string, KanaCard> = {};
    let inputIndex = 0;

    // Check each kana by trying to match its romaji from current input position
    currentPrompt.forEach((kana) => {
      const sortedRomaji = [...kana.romaji]
        .map((r) => r.toLowerCase())
        .sort((a, b) => b.length - a.length);

      const escapedRomaji = sortedRomaji.map((r) =>
        r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );

      const pattern = new RegExp(`^(${escapedRomaji.join("|")})`, "i");
      const remainingInput = normalizedInput.substring(inputIndex);
      const match = remainingInput.match(pattern);

      let matched = false;
      let matchedRomaji = "";

      if (match) {
        matched = true;
        matchedRomaji = match[1]!;
        inputIndex += matchedRomaji.length;
      } else {
        const maxRomajiLength = Math.max(...kana.romaji.map((r) => r.length));
        const endIndex = Math.min(
          inputIndex + maxRomajiLength,
          normalizedInput.length
        );
        matchedRomaji = normalizedInput.substring(inputIndex, endIndex);
        inputIndex += Math.max(1, matchedRomaji.length);
      }

      const isCorrect = matched;

      if (isCorrect) {
        correctCount++;
      } else {
        allCorrect = false;
      }

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
    setSessionState((prev) => ({
      ...prev,
      totalCorrect: newTotalCorrect,
      totalAttempts: newTotalAttempts,
    }));

    // Call the result callback
    onResult({ allCorrect, correctCount });
  };

  return {
    checkAnswers,
    previousAnswer,
  };
}

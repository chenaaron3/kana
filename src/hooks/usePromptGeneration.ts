import { useCallback, useEffect, useMemo, useState } from "react";
import { allKanaCharacters } from "~/data/kana";
import { getNextKana } from "~/utils/fsrs";
import { getBottomKanaByAccuracy } from "~/utils/promptUtils";
import { getNextWord } from "~/utils/wordBank";

import type { KanaCharacter } from "~/data/kana";
import type { EnemyStats, KanaCard, Session } from "~/types/progress";

type PromptType = "attack" | "defense";

interface UsePromptGenerationProps {
  kanaCards: Record<string, KanaCard>;
  sessionState: Session;
  promptAttempt: number;
  currentEnemy: EnemyStats;
  enemyDefeated: boolean;
  enemyWillDie: boolean;
  resetManaTimer: () => void;
}

export function usePromptGeneration({
  kanaCards,
  sessionState,
  promptAttempt,
  currentEnemy,
  enemyDefeated,
  enemyWillDie,
  resetManaTimer,
}: UsePromptGenerationProps) {
  const [currentPrompt, setCurrentPrompt] = useState<KanaCharacter[]>([]);
  const [currentWordString, setCurrentWordString] = useState<string | null>(
    null
  );
  const [promptType, setPromptType] = useState<PromptType>("attack");

  // Get available kana based on selection - memoize to prevent unnecessary recalculations
  const availableKana = useMemo(
    () =>
      allKanaCharacters.filter((k) =>
        sessionState.selectedKanaIds.includes(k.id)
      ),
    [sessionState.selectedKanaIds]
  );

  // Generate prompt based on type and current state
  const generatePrompt = useCallback(
    (type: PromptType): KanaCharacter[] => {
      // Defense prompts: use hardest kana (bottom 10 by accuracy)
      if (type === "defense") {
        setCurrentWordString(null); // Defense uses individual kana mode

        const bottomKana = getBottomKanaByAccuracy(
          availableKana,
          kanaCards,
          10
        );
        if (bottomKana.length === 0) {
          // Fallback if no kana available
          return availableKana.slice(0, Math.min(3, availableKana.length));
        }

        // Max 3 prompts for defense, scaling by enemies
        const promptLength = Math.min(sessionState.enemiesDefeated + 1, 3);
        // Shuffle and take sample
        const shuffled = [...bottomKana].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(promptLength, shuffled.length));
      }

      // Attack prompts: use normal logic
      // Try word mode first
      const wordKana = getNextWord(
        availableKana,
        kanaCards,
        sessionState.enemiesDefeated + 2
      );
      if (wordKana && wordKana.length > 0) {
        // Word mode - store the word string for translation lookup
        const wordString = wordKana.map((k) => k.character).join("");
        setCurrentWordString(wordString);
        return wordKana;
      }

      // Individual kana mode - clear word string
      setCurrentWordString(null);

      const promptLength = 3;
      const newPrompt: KanaCharacter[] = [];
      const usedIds = new Set<string>();

      for (
        let i = 0;
        i < promptLength && newPrompt.length < availableKana.length;
        i++
      ) {
        const remaining = availableKana.filter((k) => !usedIds.has(k.id));
        if (remaining.length === 0) break;

        const next = getNextKana(remaining, kanaCards);
        if (next) {
          newPrompt.push(next);
          usedIds.add(next.id);
        } else {
          const random =
            remaining[Math.floor(Math.random() * remaining.length)];
          if (random) {
            newPrompt.push(random);
            usedIds.add(random.id);
          }
        }
      }
      return newPrompt;
    },
    [availableKana, kanaCards, sessionState.enemiesDefeated]
  );

  // Generate prompt when dependencies change
  useEffect(() => {
    // Don't generate prompt if enemy is defeated (during 2-second transition) or will die
    if (enemyDefeated || enemyWillDie) return;

    // Switch when promptAttempt is a multiple of enemy.attack (and > 0)
    let newPromptType: PromptType = "attack";
    if (promptAttempt > 0 && promptAttempt % currentEnemy.attack === 0) {
      newPromptType = "defense";
    }
    const prompt = generatePrompt(newPromptType);
    setPromptType(newPromptType);
    resetManaTimer();
    setCurrentPrompt(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    promptAttempt,
    enemyDefeated,
    enemyWillDie,
    currentEnemy.attack,
    generatePrompt,
    // resetManaTimer is intentionally excluded - we call it but don't depend on it
    // Including it would cause prompts to regenerate when combo resets (timerDuration changes)
  ]);

  return {
    currentPrompt,
    currentWordString,
    promptType,
    setCurrentPrompt,
  };
}

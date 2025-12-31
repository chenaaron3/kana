import { useCallback, useEffect, useState } from "react";

interface UseManaTimerParams {
  combo: number;
  currentPromptLength: number;
  isGameOver: boolean;
  enemyWillDie: boolean;
  onTimerExpire: () => void;
  timerDuration: number; // Dynamic timer duration based on combo level
}

export function useManaTimer({
  combo,
  currentPromptLength,
  isGameOver,
  enemyWillDie,
  onTimerExpire,
  timerDuration,
}: UseManaTimerParams) {
  const [manaTimeRemaining, setManaTimeRemaining] =
    useState<number>(timerDuration);

  // Update timer duration when combo changes
  useEffect(() => {
    setManaTimeRemaining(timerDuration);
  }, [timerDuration]);

  // Mana timer countdown - runs for all combos (including 0) to allow combo expiration
  useEffect(() => {
    if (currentPromptLength > 0 && !isGameOver && !enemyWillDie) {
      const interval = setInterval(() => {
        setManaTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 500);
          if (newTime <= 0) {
            // Timer expired - reset combo
            onTimerExpire();
            return 0;
          }
          return newTime;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [combo, currentPromptLength, isGameOver, enemyWillDie, onTimerExpire]);

  const resetManaTimer = useCallback(() => {
    setManaTimeRemaining(timerDuration);
  }, [timerDuration]);

  return {
    manaTimeRemaining,
    resetManaTimer,
  };
}

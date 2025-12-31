import { useEffect, useMemo, useRef } from "react";
import { createGameStore } from "~/store/gameStore";

import type { Session } from "~/types/progress";

interface UseGameStateProps {
  initialSession: Session;
  enemyRef: React.RefObject<{ playDie: () => void } | null>;
  onEnemyDefeated: () => void;
}

export function useGameState({
  initialSession,
  enemyRef,
  onEnemyDefeated,
}: UseGameStateProps) {
  // Create store instance for this game session (memoized)
  const useStore = useMemo(
    () => createGameStore(initialSession),
    [initialSession]
  );

  // Get state and actions from store
  const enemyDefeated = useStore((state) => state.enemyDefeated);
  const spawnNewEnemy = useStore.getState().spawnNewEnemy;

  // Track timeout to prevent duplicate calls
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle enemy defeat - spawn new enemy
  useEffect(() => {
    if (enemyDefeated) {
      // Clear any existing timeout to prevent duplicate calls
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      enemyRef.current?.playDie();

      // Spawn new enemy and increment enemies defeated after 2 seconds
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        spawnNewEnemy();
        onEnemyDefeated();
      }, 2000);
    }

    // Cleanup function to clear timeout on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enemyDefeated, enemyRef, onEnemyDefeated, spawnNewEnemy]);

  // Return store hook
  return {
    useStore,
  };
}

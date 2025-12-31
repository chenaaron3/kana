import { useEffect, useMemo } from "react";
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

  // Handle enemy defeat - spawn new enemy
  useEffect(() => {
    if (enemyDefeated) {
      enemyRef.current?.playDie();

      // Spawn new enemy and increment enemies defeated after 2 seconds
      setTimeout(() => {
        spawnNewEnemy();
        onEnemyDefeated();
      }, 2000);
    }
  }, [enemyDefeated, enemyRef, onEnemyDefeated, spawnNewEnemy]);

  // Return store hook
  return {
    useStore,
  };
}

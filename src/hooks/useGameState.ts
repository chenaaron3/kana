import { useEffect, useState } from "react";
import { generateNewEnemy } from "~/utils/promptUtils";

import type { EnemyStats, Session } from "~/types/progress";

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
  const [currentEnemy, setCurrentEnemy] = useState<EnemyStats>(() =>
    generateNewEnemy()
  );
  const [playerLives, setPlayerLives] = useState<number>(3);
  const [promptAttempt, setPromptAttempt] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [enemyDefeated, setEnemyDefeated] = useState<boolean>(false);
  const [enemyWillDie, setEnemyWillDie] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [sessionState, setSessionState] = useState<Session>(initialSession);

  // Handle enemy defeat - spawn new enemy
  useEffect(() => {
    if (enemyDefeated) {
      enemyRef.current?.playDie();

      // Spawn new enemy and increment enemies defeated after 2 seconds
      setTimeout(() => {
        const newEnemy = generateNewEnemy();
        setCurrentEnemy(newEnemy);
        setPromptAttempt(0);
        setEnemyDefeated(false);
        setEnemyWillDie(false);
        setSessionState((prev) => ({
          ...prev,
          enemiesDefeated: prev.enemiesDefeated + 1,
        }));
        onEnemyDefeated();
      }, 2000);
    }
  }, [enemyDefeated, enemyRef, onEnemyDefeated]);

  return {
    // State
    currentEnemy,
    playerLives,
    promptAttempt,
    isGameOver,
    enemyDefeated,
    enemyWillDie,
    combo,
    sessionState,
    // Setters
    setCurrentEnemy,
    setPlayerLives,
    setPromptAttempt,
    setIsGameOver,
    setEnemyDefeated,
    setEnemyWillDie,
    setCombo,
    setSessionState,
  };
}

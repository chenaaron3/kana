import { getComboConfig } from "~/constants";

import type { EnemyRef } from "~/components/Enemy";
import type { PlayerRef } from "~/components/Player";
import type { GameStoreHook } from "~/store/gameStore";

interface UseCombatProps {
  enemyRef: React.RefObject<EnemyRef | null>;
  playerRef: React.RefObject<PlayerRef | null>;
  useStore: GameStoreHook;
}

export function useCombat({ enemyRef, playerRef, useStore }: UseCombatProps) {
  // Get state from store
  const combo = useStore((state) => state.combo);

  // Get actions from store (using getState to avoid re-renders)
  const incrementCombo = useStore.getState().incrementCombo;
  const resetCombo = useStore.getState().resetCombo;
  const setEnemyWillDie = useStore.getState().setEnemyWillDie;
  const setEnemyDefeated = useStore.getState().setEnemyDefeated;
  const setCurrentPrompt = useStore.getState().setCurrentPrompt;
  const setPlayerLives = useStore.getState().setPlayerLives;
  const setIsGameOver = useStore.getState().setIsGameOver;

  // Calculate damage multiplier based on combo
  const getComboMultiplier = (comboCount: number): number => {
    return getComboConfig(comboCount).multiplier;
  };

  const playerAttack = (damage: number = 1) => {
    // Check if enemy will die from this damage
    const willDie = enemyRef.current?.willDie(damage) ?? false;
    setEnemyWillDie(willDie);

    playerRef.current?.playAttack();
    setTimeout(() => {
      const defeated = enemyRef.current?.playHit(damage) ?? false;
      if (defeated) {
        setCurrentPrompt([]);
        setEnemyDefeated(true);
      }
    }, 500);
  };

  const enemyAttack = () => {
    enemyRef.current?.playAttack();
    setTimeout(() => {
      playerRef.current?.playHit();
      // Reduce player lives when enemy attacks
      const currentLives = useStore.getState().playerLives;
      const newLives = currentLives - 1;
      setPlayerLives(newLives);
      // Check for game over
      if (newLives <= 0) {
        setIsGameOver(true);
      }
    }, 500);
  };

  const handleCombatResult = (
    isCorrect: boolean,
    promptType: "attack" | "defense"
  ) => {
    if (promptType === "attack") {
      if (isCorrect) {
        // Correct attack - calculate damage with combo multiplier
        incrementCombo();
        const newCombo = combo + 1;
        const damageMultiplier = getComboMultiplier(newCombo);
        const damage = Math.ceil(1 * damageMultiplier);

        playerAttack(damage);
      } else {
        // Incorrect attack - reset combo and enemy heals
        resetCombo();
        // Heal enemy by 1 HP
        enemyRef.current?.heal(1);
        // Show player miss indicator
        playerRef.current?.miss();
      }
    } else {
      // Defense prompt
      if (isCorrect) {
        // Blocked attack - reward player with a heart and increment combo
        incrementCombo();
        playerRef.current?.playHeal();
        enemyRef.current?.playMiss(); // Plays miss animation and shows floating text
        // Restore a life if player has less than 3 lives
        // setPlayerLives((prev) => Math.min(3, prev + 1));
      } else {
        // Failed defense - reset combo and enemy attacks
        resetCombo();
        enemyAttack();
      }
    }
  };

  return {
    playerAttack,
    enemyAttack,
    handleCombatResult,
    getComboMultiplier,
  };
}

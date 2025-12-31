import { getComboConfig } from "~/constants";

import type { EnemyRef } from "~/components/Enemy";
import type { PlayerRef } from "~/components/Player";

interface UseCombatProps {
  enemyRef: React.RefObject<EnemyRef | null>;
  playerRef: React.RefObject<PlayerRef | null>;
  combo: number;
  setCombo: React.Dispatch<React.SetStateAction<number>>;
  setEnemyWillDie: React.Dispatch<React.SetStateAction<boolean>>;
  setEnemyDefeated: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentPrompt: React.Dispatch<React.SetStateAction<any[]>>;
  setPlayerLives: React.Dispatch<React.SetStateAction<number>>;
  setIsGameOver: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useCombat({
  enemyRef,
  playerRef,
  combo,
  setCombo,
  setEnemyWillDie,
  setEnemyDefeated,
  setCurrentPrompt,
  setPlayerLives,
  setIsGameOver,
}: UseCombatProps) {
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
      setPlayerLives((prev) => {
        const newLives = prev - 1;
        // Check for game over
        if (newLives <= 0) {
          setIsGameOver(true);
        }
        return newLives;
      });
    }, 500);
  };

  const handleCombatResult = (
    isCorrect: boolean,
    promptType: "attack" | "defense"
  ) => {
    if (promptType === "attack") {
      if (isCorrect) {
        // Correct attack - calculate damage with combo multiplier
        const newCombo = combo + 1;
        setCombo(newCombo);
        const damageMultiplier = getComboMultiplier(newCombo);
        const damage = Math.ceil(1 * damageMultiplier);

        playerAttack(damage);
      } else {
        // Incorrect attack - reset combo and enemy heals
        setCombo(0);
        // Heal enemy by 1 HP
        enemyRef.current?.heal(1);
        // Show player miss indicator
        playerRef.current?.miss();
      }
    } else {
      // Defense prompt
      if (isCorrect) {
        // Blocked attack - reward player with a heart and increment combo
        const newCombo = combo + 1;
        setCombo(newCombo);
        playerRef.current?.playHeal();
        enemyRef.current?.playMiss(); // Plays miss animation and shows floating text
        // Restore a life if player has less than 3 lives
        // setPlayerLives((prev) => Math.min(3, prev + 1));
      } else {
        // Failed defense - reset combo and enemy attacks
        setCombo(0);
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

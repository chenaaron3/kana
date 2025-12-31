import type { StateCreator } from "zustand";
import { generateNewEnemy } from "~/utils/promptUtils";

import type { EnemyStats, Session } from "~/types/progress";

export interface GameState {
  currentEnemy: EnemyStats;
  playerLives: number;
  promptAttempt: number;
  isGameOver: boolean;
  enemyDefeated: boolean;
  enemyWillDie: boolean;
  combo: number;
  sessionState: Session;
  manaTimeRemaining: number;
}

export interface GameActions {
  setCurrentEnemy: (enemy: EnemyStats) => void;
  setPlayerLives: (lives: number) => void;
  incrementPromptAttempt: () => void;
  setIsGameOver: (isGameOver: boolean) => void;
  setEnemyDefeated: (defeated: boolean) => void;
  setEnemyWillDie: (willDie: boolean) => void;
  setCombo: (combo: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  updateSession: (updates: Partial<Session>) => void;
  spawnNewEnemy: () => void;
  setManaTimeRemaining: (time: number) => void;
}

export type GameSlice = GameState & GameActions;

export const createGameSlice =
  (initialSession: Session): StateCreator<GameSlice> =>
  (set) => ({
    // Initial state
    currentEnemy: generateNewEnemy(),
    playerLives: 3,
    promptAttempt: 0,
    isGameOver: false,
    enemyDefeated: false,
    enemyWillDie: false,
    combo: 0,
    sessionState: initialSession,
    manaTimeRemaining: 0,

    // Actions
    setCurrentEnemy: (enemy) => {
      set({ currentEnemy: enemy });
    },
    setPlayerLives: (lives) => {
      set({ playerLives: lives });
    },
    incrementPromptAttempt: () => {
      set((state) => ({ promptAttempt: state.promptAttempt + 1 }));
    },
    setIsGameOver: (isGameOver) => {
      set({ isGameOver });
    },
    setEnemyDefeated: (defeated) => {
      set({ enemyDefeated: defeated });
    },
    setEnemyWillDie: (willDie) => {
      set({ enemyWillDie: willDie });
    },
    setCombo: (combo) => {
      set({ combo });
    },
    incrementCombo: () => {
      set((state) => ({ combo: state.combo + 1 }));
    },
    resetCombo: () => {
      set({ combo: 0 });
    },
    updateSession: (updates) => {
      set((state) => ({
        sessionState: { ...state.sessionState, ...updates },
      }));
    },
    spawnNewEnemy: () => {
      set((state) => ({
        currentEnemy: generateNewEnemy(),
        promptAttempt: 0,
        enemyDefeated: false,
        enemyWillDie: false,
        sessionState: {
          ...state.sessionState,
          enemiesDefeated: state.sessionState.enemiesDefeated + 1,
        },
      }));
    },
    setManaTimeRemaining: (time) => {
      set({ manaTimeRemaining: time });
    },
  });

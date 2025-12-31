import { useCallback, useEffect, useRef } from 'react';
import { getComboConfig, getEffectiveTimerDuration } from '~/constants';
import { useAnswerChecking } from '~/hooks/useAnswerChecking';
import { useCombat } from '~/hooks/useCombat';
import { useGameState } from '~/hooks/useGameState';
import { useKanaCards } from '~/hooks/useKanaCards';
import { useManaTimer } from '~/hooks/useManaTimer';
import { useMobileViewport } from '~/hooks/useMobileViewport';
import { usePromptGeneration } from '~/hooks/usePromptGeneration';

import GameOver from './GameOver';
import GameArea from './quiz/GameArea';
import QuizHeader from './quiz/QuizHeader';

import type { GameStore } from '~/store/gameStore';

import type { Session } from "~/types/progress";
import type { EnemyRef } from './Enemy';
import type { PlayerRef } from './Player';
interface KanaQuizProps {
  session: Session;
  onBack: () => void;
}

export default function KanaQuiz({ session, onBack }: KanaQuizProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<EnemyRef>(null);
  const playerRef = useRef<PlayerRef>(null);

  // Custom hooks
  const { kanaCards, updateKanaCards } = useKanaCards({
    selectedKanaIds: session.selectedKanaIds,
  });

  const { useStore } = useGameState({
    initialSession: session,
    enemyRef,
    onEnemyDefeated: () => {
      // Callback when enemy is defeated - can be used for cleanup if needed
    },
  });

  // Get state from store
  const combo = useStore((state: GameStore) => state.combo);
  const currentPrompt = useStore((state: GameStore) => state.currentPrompt);
  const promptType = useStore((state: GameStore) => state.promptType);
  const isGameOver = useStore((state: GameStore) => state.isGameOver);
  const enemyDefeated = useStore((state: GameStore) => state.enemyDefeated);
  const enemyWillDie = useStore((state: GameStore) => state.enemyWillDie);
  const userInput = useStore((state: GameStore) => state.userInput);
  const setUserInput = useStore.getState().setUserInput;
  const incrementPromptAttempt = useStore.getState().incrementPromptAttempt;

  // Memoize timer expire callback
  const resetCombo = useStore.getState().resetCombo;
  const handleTimerExpire = useCallback(() => {
    resetCombo();
  }, [resetCombo]);

  // Mana timer hook - get timer duration based on current combo level
  const comboConfig = getComboConfig(combo);

  const setManaTimeRemaining = useStore.getState().setManaTimeRemaining;

  const { manaTimeRemaining, resetManaTimer } = useManaTimer({
    combo,
    currentPromptLength: currentPrompt.length,
    isGameOver,
    enemyWillDie,
    onTimerExpire: handleTimerExpire,
    // Add some time additional time for longer prompts
    timerDuration: getEffectiveTimerDuration(comboConfig, currentPrompt.length),
  });

  // Sync manaTimeRemaining to store
  useEffect(() => {
    setManaTimeRemaining(manaTimeRemaining);
  }, [manaTimeRemaining, setManaTimeRemaining]);

  usePromptGeneration({
    kanaCards,
    resetManaTimer,
    useStore,
  });

  const { checkAnswers } = useAnswerChecking({
    kanaCards,
    updateKanaCards,
    useStore,
  });

  const { handleCombatResult } = useCombat({
    enemyRef,
    playerRef,
    useStore,
  });

  const { isMobile, visualViewportHeight, headerRef } = useMobileViewport();

  // Handle answer submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && currentPrompt.length > 0 && !isGameOver && !enemyDefeated && !enemyWillDie) {
      checkAnswers(userInput, (result) => {
        // Increment prompt attempt (regardless of prompt type or correctness)
        incrementPromptAttempt();

        // Handle combat result
        handleCombatResult(result.allCorrect, promptType);

        // Reset mana timer when user submits answer
        resetManaTimer();

        // Clear user input
        setUserInput("");
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const handleRestart = () => {
    onBack();
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-background overflow-hidden"
      style={{
        height: isMobile && visualViewportHeight > 0 ? `${visualViewportHeight}px` : '100dvh',
        maxHeight: isMobile && visualViewportHeight > 0 ? `${visualViewportHeight}px` : '100dvh'
      }}
    >
      {/* Header Bar */}
      <QuizHeader
        onBack={onBack}
        headerRef={headerRef as React.RefObject<HTMLDivElement>}
        useStore={useStore}
      />

      {/* Main Quiz Area */}
      {!isGameOver && (
        <GameArea
          playerRef={playerRef}
          enemyRef={enemyRef}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          useStore={useStore}
        />
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <GameOver
          useStore={useStore}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

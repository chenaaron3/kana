import { useCallback, useEffect, useRef, useState } from 'react';
import { getComboConfig } from '~/constants';
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

  const {
    currentEnemy,
    playerLives,
    promptAttempt,
    isGameOver,
    enemyDefeated,
    enemyWillDie,
    combo,
    sessionState,
    setPlayerLives,
    setPromptAttempt,
    setIsGameOver,
    setEnemyDefeated,
    setEnemyWillDie,
    setCombo,
    setSessionState,
  } = useGameState({
    initialSession: session,
    enemyRef,
    onEnemyDefeated: () => {
      // Callback when enemy is defeated - can be used for cleanup if needed
    },
  });

  // Memoize timer expire callback
  const handleTimerExpire = useCallback(() => {
    setCombo(0);
  }, [setCombo]);

  // Mana timer hook - get timer duration based on current combo level
  const comboConfig = getComboConfig(combo);

  // We need to initialize currentPrompt for useManaTimer, but it comes from usePromptGeneration
  // So we'll use a ref to track it, or initialize with empty array and update
  const [currentPromptForTimer, setCurrentPromptForTimer] = useState<any[]>([]);

  const { manaTimeRemaining, resetManaTimer } = useManaTimer({
    combo,
    currentPromptLength: currentPromptForTimer.length,
    isGameOver,
    enemyWillDie,
    onTimerExpire: handleTimerExpire,
    timerDuration: comboConfig.timerMs,
  });

  const {
    currentPrompt,
    currentWordString,
    promptType,
    setCurrentPrompt,
  } = usePromptGeneration({
    kanaCards,
    sessionState,
    promptAttempt,
    currentEnemy,
    enemyDefeated,
    enemyWillDie,
    resetManaTimer,
  });

  // Sync currentPrompt for useManaTimer
  // This is a workaround - ideally useManaTimer would accept currentPrompt directly
  // but we need to call hooks in order
  useEffect(() => {
    setCurrentPromptForTimer(currentPrompt);
  }, [currentPrompt]);

  // Update prompt generation with resetManaTimer
  // We need to recreate the prompt generation hook call, but since hooks can't be conditionally called,
  // we'll pass resetManaTimer through a ref or handle it differently
  // Actually, let's restructure - we'll call usePromptGeneration after useManaTimer
  // But that violates rules of hooks. Let's use a different approach - pass resetManaTimer as a prop
  // Actually, looking at the code, resetManaTimer is stable, so we can just pass it directly
  // Let me fix this by restructuring the hooks properly

  const { checkAnswers, previousAnswer } = useAnswerChecking({
    kanaCards,
    currentPrompt,
    currentWordString,
    sessionState,
    updateKanaCards,
    setSessionState,
    selectedKanaIds: sessionState.selectedKanaIds,
  });

  const { handleCombatResult } = useCombat({
    enemyRef,
    playerRef,
    combo,
    setCombo,
    setEnemyWillDie,
    setEnemyDefeated,
    setCurrentPrompt,
    setPlayerLives,
    setIsGameOver,
  });

  const { isMobile, visualViewportHeight, headerRef } = useMobileViewport();

  // User input state
  const [userInput, setUserInput] = useState("");

  // Handle answer submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && currentPrompt.length > 0 && !isGameOver && !enemyDefeated && !enemyWillDie) {
      checkAnswers(userInput, (result) => {
        // Increment prompt attempt (regardless of prompt type or correctness)
        setPromptAttempt((prev) => prev + 1);

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

  const handleInputFocus = () => {
    // Scroll to top on mobile when input is focused
    if (window.innerWidth < 768) {
      // window.scrollTo({ top: 0, behavior: 'smooth' });
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
        previousAnswer={previousAnswer}
        onBack={onBack}
        headerRef={headerRef as React.RefObject<HTMLDivElement>}
        isMobile={isMobile}
      />

      {/* Main Quiz Area */}
      {!isGameOver && (
        <GameArea
          playerRef={playerRef}
          enemyRef={enemyRef}
          promptType={promptType}
          currentEnemy={currentEnemy}
          promptAttempt={promptAttempt}
          combo={combo}
          manaTimeRemaining={manaTimeRemaining}
          currentPrompt={currentPrompt}
          userInput={userInput}
          setUserInput={setUserInput}
          onSubmit={handleSubmit}
          onKeyPress={handleKeyPress}
          onInputFocus={handleInputFocus}
          enemyWillDie={enemyWillDie}
          isGameOver={isGameOver}
          enemyDefeated={enemyDefeated}
          playerLives={playerLives}
          sessionState={sessionState}
        />
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <GameOver
          enemiesDefeated={sessionState.enemiesDefeated}
          totalCorrect={sessionState.totalCorrect}
          totalAttempts={sessionState.totalAttempts}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '~/components/ui/8bit/button';
import { Card, CardContent } from '~/components/ui/8bit/card';
import { Input } from '~/components/ui/8bit/input';
import { Kbd } from '~/components/ui/8bit/kbd';
import { getComboConfig } from '~/constants';
import hiraganaWords from '~/data/hiragana.json';
import { allKanaCharacters } from '~/data/kana';
import katakanaWords from '~/data/katakana.json';
import { useManaTimer } from '~/hooks/useManaTimer';
import { getNextKana, initializeKanaCard, reviewKana } from '~/utils/fsrs';
import { loadProgress, saveProgress } from '~/utils/storage';
import { getNextWord } from '~/utils/wordBank';

import Enemy from './Enemy';
import GameOver from './GameOver';
import Player from './Player';
import PlayerStats from './PlayerStats';

import type { KanaCharacter } from '~/data/kana';
import type { Session, PreviousAnswer, KanaCard, EnemyStats } from "~/types/progress";
import type { EnemyRef } from './Enemy';
import type { PlayerRef } from './Player';

interface KanaQuizProps {
  session: Session;
  onBack: () => void;
}

type PromptType = 'attack' | 'defense';

function generateNewEnemy(): EnemyStats {
  return {
    health: Math.floor(Math.random() * 6) + 5, // 5-10
    attack: Math.floor(Math.random() * 3) + 2, // 2-4
  };
}

export default function KanaQuiz({ session, onBack }: KanaQuizProps) {
  // Load persisted kanaCards (user's skill level)
  const [kanaCards, setKanaCards] = useState<Record<string, KanaCard>>(() => {
    const saved = loadProgress();
    if (saved?.kanaCards) {
      return saved.kanaCards;
    }
    // Initialize kanaCards for selected kana
    const cards: Record<string, KanaCard> = {};
    session.selectedKanaIds.forEach((id) => {
      cards[id] ??= initializeKanaCard(id);
    });
    return cards;
  });

  // Session state (ephemeral, lost on unmount)
  const [sessionState, setSessionState] = useState<Session>(session);

  // Game state
  const [currentEnemy, setCurrentEnemy] = useState<EnemyStats>(() => generateNewEnemy());
  const [playerLives, setPlayerLives] = useState<number>(3);
  const [promptAttempt, setPromptAttempt] = useState<number>(0);
  const [promptType, setPromptType] = useState<PromptType>('attack');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [enemyDefeated, setEnemyDefeated] = useState<boolean>(false);
  const [enemyWillDie, setEnemyWillDie] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0); // Track consecutive correct answers
  const [currentPrompt, setCurrentPrompt] = useState<KanaCharacter[]>([]);

  // Memoize timer expire callback
  const handleTimerExpire = useCallback(() => {
    setCombo(0);
  }, []);

  // Mana timer hook - get timer duration based on current combo level
  const comboConfig = getComboConfig(combo);
  const { manaTimeRemaining, resetManaTimer } = useManaTimer({
    combo,
    currentPromptLength: currentPrompt.length,
    isGameOver,
    enemyWillDie,
    onTimerExpire: handleTimerExpire,
    timerDuration: comboConfig.timerMs,
  });
  const [currentWordString, setCurrentWordString] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [previousAnswer, setPreviousAnswer] = useState<PreviousAnswer | null>(null);
  const [visualViewportHeight, setVisualViewportHeight] = useState<number>(0);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<EnemyRef>(null);
  const playerRef = useRef<PlayerRef>(null);

  // Get available kana based on selection
  const availableKana = allKanaCharacters.filter((k) =>
    sessionState.selectedKanaIds.includes(k.id),
  );

  // Helper function to get translation for a word
  const getTranslation = (wordKana: KanaCharacter[]): string | undefined => {
    const wordString = wordKana.map((k) => k.character).join('');

    // Check hiragana words
    if (wordString in hiraganaWords) {
      return (hiraganaWords as Record<string, string>)[wordString];
    }

    // Check katakana words
    if (wordString in katakanaWords) {
      return (katakanaWords as Record<string, string>)[wordString];
    }

    return undefined;
  };

  // Get bottom N kana by accuracy (lowest accuracy = hardest)
  const getBottomKanaByAccuracy = (
    kanaList: KanaCharacter[],
    cards: Record<string, KanaCard>,
    count: number = 10
  ): KanaCharacter[] => {
    // Calculate accuracy for each kana
    const kanaWithAccuracy = kanaList.map((kana) => {
      const card = cards[kana.id];
      const totalShown = card?.totalShown ?? 0;
      const totalCorrect = card?.totalCorrect ?? 0;
      // Calculate accuracy (0.0 to 1.0), default to 0.0 for new kana
      const accuracy = totalShown > 0 ? totalCorrect / totalShown : 0.0;
      return { kana, accuracy };
    });

    // Sort by accuracy (lowest first = hardest)
    kanaWithAccuracy.sort((a, b) => a.accuracy - b.accuracy);

    // Take bottom N (or all if less than N)
    const bottomKana = kanaWithAccuracy
      .slice(0, Math.min(count, kanaWithAccuracy.length))
      .map((item) => item.kana);

    return bottomKana;
  };

  // Generate prompt based on type and current state
  // Returns KanaCharacter[] regardless of whether word mode or individual kana mode is used
  const generatePrompt = (
    type: PromptType,
    cards: Record<string, KanaCard>
  ): KanaCharacter[] => {
    // Defense prompts: use hardest kana (bottom 10 by accuracy)
    if (type === 'defense') {
      setCurrentWordString(null); // Defense uses individual kana mode

      const bottomKana = getBottomKanaByAccuracy(availableKana, cards, 10);
      if (bottomKana.length === 0) {
        // Fallback if no kana available
        return availableKana.slice(0, Math.min(3, availableKana.length));
      }

      // Max 3 promps for defense, scaling by enemies
      const promptLength = Math.min(sessionState.enemiesDefeated + 1, 3);
      // Shuffle and take sample
      const shuffled = [...bottomKana].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(promptLength, shuffled.length));
    }

    // Attack prompts: use normal logic
    // Try word mode first
    const wordKana = getNextWord(availableKana, cards, sessionState.enemiesDefeated + 2);
    if (wordKana && wordKana.length > 0) {
      // Word mode - store the word string for translation lookup
      const wordString = wordKana.map((k) => k.character).join('');
      setCurrentWordString(wordString);
      return wordKana;
    }

    // Individual kana mode - clear word string
    setCurrentWordString(null);

    const promptLength = 3;
    const newPrompt: KanaCharacter[] = [];
    const usedIds = new Set<string>();

    for (let i = 0; i < promptLength && newPrompt.length < availableKana.length; i++) {
      const remaining = availableKana.filter((k) => !usedIds.has(k.id));
      if (remaining.length === 0) break;

      const next = getNextKana(remaining, cards);
      if (next) {
        newPrompt.push(next);
        usedIds.add(next.id);
      } else {
        const random = remaining[Math.floor(Math.random() * remaining.length)];
        if (random) {
          newPrompt.push(random);
          usedIds.add(random.id);
        }
      }
    }
    return newPrompt;
  };

  // Check if it's time to switch to defense prompt based on promptAttempt

  useEffect(() => {
    // Don't generate prompt if enemy is defeated (during 2-second transition) or will die
    if (enemyDefeated || enemyWillDie) return;

    // Switch when promptAttempt is a multiple of enemy.attack (and > 0)
    let promptType: PromptType = 'attack';
    if (promptAttempt > 0 && promptAttempt % currentEnemy.attack === 0) {
      promptType = 'defense';
    }
    const prompt = generatePrompt(promptType, kanaCards);
    setPromptType(promptType);
    resetManaTimer();
    setCurrentPrompt(prompt);
    setUserInput("");
  }, [promptAttempt, enemyDefeated, currentEnemy.attack, sessionState.enemiesDefeated]);

  // Clear previousAnswer only when selectedKanaIds changes
  useEffect(() => {
    setPreviousAnswer(null);
  }, [sessionState.selectedKanaIds]);

  // Detect mobile and measure header height
  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < 768);
    };
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateMobileState();
    updateHeaderHeight();

    // Re-measure when previousAnswer changes (affects header height)
    const observer = new ResizeObserver(() => {
      updateHeaderHeight();
    });
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    const handleResize = () => {
      updateMobileState();
      updateHeaderHeight();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [previousAnswer]);

  // Use VisualViewport API to handle keyboard and keep header visible (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    // Check if VisualViewport API is supported
    if (!window.visualViewport) {
      // Fallback: use window height
      const updateHeight = () => {
        setVisualViewportHeight(window.innerHeight);
      };
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const viewport = window.visualViewport;

    const updateViewport = () => {
      // Update container height to match visual viewport
      setVisualViewportHeight(viewport.height);

      // Ensure header stays at top of visual viewport
      // Use offsetTop to position header relative to visual viewport
      if (headerRef.current) {
        const offsetTop = viewport.offsetTop;
        headerRef.current.style.transform = `translateY(${offsetTop}px)`;
      }
    };

    // Initial update
    updateViewport();

    // Listen to visual viewport changes (keyboard open/close, zoom, etc.)
    viewport.addEventListener('resize', updateViewport);
    viewport.addEventListener('scroll', updateViewport);

    return () => {
      viewport.removeEventListener('resize', updateViewport);
      viewport.removeEventListener('scroll', updateViewport);
    };
  }, [isMobile]);

  // Auto focus input when prompt changes
  useEffect(() => {
    if (currentPrompt.length > 0 && inputRef.current && !isGameOver && !enemyDefeated && !enemyWillDie) {
      inputRef.current.focus();
    }
  }, [currentPrompt, isGameOver, enemyDefeated, enemyWillDie]);

  // Handle enemy defeat - spawn new enemy
  useEffect(() => {
    if (enemyDefeated) {
      enemyRef.current?.playDie();

      // Clear user input and willDie state during transition (prompt will show "DEFEATED")
      setUserInput("");

      // Spawn new enemy and increment enemies defeated after 2 seconds
      setTimeout(() => {
        const newEnemy = generateNewEnemy();
        setCurrentEnemy(newEnemy);
        setPromptAttempt(0);
        setPromptType('attack');
        setEnemyDefeated(false);
        setEnemyWillDie(false);
        setSessionState((prev) => ({
          ...prev,
          enemiesDefeated: prev.enemiesDefeated + 1,
        }));
      }, 2000);
    }
  }, [enemyDefeated]);


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

  // Calculate damage multiplier based on combo
  const getComboMultiplier = (comboCount: number): number => {
    return getComboConfig(comboCount).multiplier;
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

  const checkAnswers = (input: string) => {
    if (currentPrompt.length === 0 || isGameOver || enemyDefeated || enemyWillDie) return;

    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return;

    let allCorrect = true;
    let correctCount = 0;
    const updatedKanaCards: Record<string, KanaCard> = {};
    let inputIndex = 0;

    // Check each kana by trying to match its romaji from current input position
    currentPrompt.forEach((kana) => {
      const sortedRomaji = [...kana.romaji]
        .map((r) => r.toLowerCase())
        .sort((a, b) => b.length - a.length);

      const escapedRomaji = sortedRomaji.map((r) =>
        r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );

      const pattern = new RegExp(`^(${escapedRomaji.join("|")})`, "i");
      const remainingInput = normalizedInput.substring(inputIndex);
      const match = remainingInput.match(pattern);

      let matched = false;
      let matchedRomaji = "";

      if (match) {
        matched = true;
        matchedRomaji = match[1]!;
        inputIndex += matchedRomaji.length;
      } else {
        const maxRomajiLength = Math.max(...kana.romaji.map((r) => r.length));
        const endIndex = Math.min(
          inputIndex + maxRomajiLength,
          normalizedInput.length,
        );
        matchedRomaji = normalizedInput.substring(inputIndex, endIndex);
        inputIndex += Math.max(1, matchedRomaji.length);
      }

      const isCorrect = matched;

      if (isCorrect) {
        correctCount++;
      } else {
        allCorrect = false;
      }

      // Update FSRS card
      let kanaCard = kanaCards[kana.id];
      kanaCard ??= initializeKanaCard(kana.id);
      const updatedCard = reviewKana(kanaCard, isCorrect);
      updatedKanaCards[kana.id] = updatedCard;
    });

    // Update accuracy tracking
    const newTotalCorrect = sessionState.totalCorrect + correctCount;
    const newTotalAttempts = sessionState.totalAttempts + currentPrompt.length;

    // Get translation if this was a word
    const translation = currentWordString
      ? getTranslation(currentPrompt)
      : undefined;

    // Store the previous answer
    setPreviousAnswer({
      kana: currentPrompt,
      userInput: input,
      isCorrect: allCorrect,
      translation,
    });

    // Update kanaCards state and save to persistent storage
    const finalKanaCards = { ...kanaCards, ...updatedKanaCards };
    setKanaCards(finalKanaCards);
    saveProgress({ kanaCards: finalKanaCards });

    // Update session state
    setSessionState((prev) => ({
      ...prev,
      totalCorrect: newTotalCorrect,
      totalAttempts: newTotalAttempts,
    }));

    // Increment prompt attempt (regardless of prompt type or correctness)
    const newPromptAttempt = promptAttempt + 1;
    setPromptAttempt(newPromptAttempt);

    // Handle attack vs defense prompts differently
    if (promptType === 'attack') {
      if (allCorrect) {
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
      if (allCorrect) {
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

    // Reset mana timer when user submits answer (gives them 3 seconds for next prompt)
    resetManaTimer();

    // Note: New prompt will be generated by useEffect when promptType or other dependencies change
    setUserInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && currentPrompt.length > 0 && !isGameOver && !enemyDefeated && !enemyWillDie) {
      checkAnswers(userInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const handleInputFocus = () => {
    // Scroll to top on mobile when input is focused
    if (window.innerWidth < 768) { // Mobile breakpoint
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
      {/* Header Bar - Always visible with Back button and Previous Answer */}
      <div
        ref={headerRef}
        className={`${isMobile ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-10 ${previousAnswer
          ? previousAnswer.isCorrect
            ? "bg-green-600 border-green-600"
            : "bg-red-600 border-red-600"
          : "bg-amber-50 border-border shadow-sm"
          }`}
      >
        <div className="relative mx-auto max-w-4xl p-1 md:p-3 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <Button
              onClick={onBack}
              variant={previousAnswer ? "ghost" : "outline"}
              className={previousAnswer ? "text-white hover:bg-white/20 border-white" : ""}
            >
              Exit
            </Button>

            {/* Previous Answer - Right aligned on mobile, centered on desktop */}
            {previousAnswer && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-end md:left-1/2 md:-translate-x-1/2 md:items-center">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-base md:text-xl font-semibold">
                    {previousAnswer.kana.map(k => k.character).join('')} = {previousAnswer.kana.map(k => k.romaji[0]).join('')}
                  </span>
                  {previousAnswer.isCorrect && (
                    <span className="text-lg md:text-2xl">✓</span>
                  )}
                </div>
                {previousAnswer.isCorrect && previousAnswer.translation && (
                  <div className="text-xs md:text-sm text-white/80">
                    Translation: {previousAnswer.translation}
                  </div>
                )}
                {!previousAnswer.isCorrect && (
                  <div className="text-xs md:text-sm text-white">
                    You typed: <span className="font-mono font-semibold">{previousAnswer.userInput}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile-only: Hearts and Score below navbar */}
        {!isGameOver && (
          <div className="md:hidden bg-white px-4 py-2">
            <div className="mx-auto max-w-4xl flex items-center justify-between">
              <PlayerStats
                playerLives={playerLives}
                totalCorrect={sessionState.totalCorrect}
                totalAttempts={sessionState.totalAttempts}
                variant="mobile"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Quiz Area */}
      {!isGameOver && (
        <div
          className="fixed bottom-0 md:relative flex-1 flex flex-col min-h-0"
        >
          {/* Player and Enemy - flex grow */}
          <div className="flex-1 flex items-end px-4 pointer-events-none min-h-0">
            <div className="w-full max-w-4xl mx-auto flex">
              {/* Player on the left half */}
              <div className="flex-1 flex justify-center items-end h-full">
                <Player
                  ref={playerRef}
                  isActive={promptType === 'attack'}
                  enemySpriteRef={enemyRef.current ? { current: enemyRef.current.getSpriteElement() } as React.RefObject<HTMLElement | null> : undefined}
                  combo={combo}
                  manaTimeRemaining={manaTimeRemaining}
                />
              </div>

              {/* Enemy on the right half */}
              <div className="flex-1 flex justify-center items-end h-full">
                <Enemy
                  ref={enemyRef}
                  enemy={currentEnemy}
                  isActive={promptType === 'defense'}
                  turnsUntilAttack={
                    promptType === 'attack'
                      ? currentEnemy.attack - (promptAttempt % currentEnemy.attack)
                      : undefined
                  }
                />
              </div>
            </div>
          </div>

          {/* Current Prompt - centered, positioned for keyboard */}
          <div className="z-10 w-full max-w-2xl px-4 mx-auto pb-4 md:relative md:z-auto md:bottom-auto md:pb-0 md:shrink-0">
            <Card>
              <CardContent className={`relative p-3 md:p-6 ${enemyWillDie
                ? 'bg-blue-100/60'
                : promptType === 'defense'
                  ? 'bg-red-100/60'
                  : ''
                }`}>
                {/* Player Stats - top corners (desktop only) */}
                <PlayerStats
                  playerLives={playerLives}
                  totalCorrect={sessionState.totalCorrect}
                  totalAttempts={sessionState.totalAttempts}
                  variant="desktop"
                />
                <div className="space-y-6 text-center">
                  <div className="flex items-center justify-center flex-wrap min-h-[30px]">
                    {enemyWillDie ? (
                      <Kbd className="text-xl md:text-3xl font-bold py-2">
                        DEFEATED
                      </Kbd>
                    ) : (
                      currentPrompt.map((kana, index) => (
                        <Kbd key={index} className="text-4xl md:text-5xl font-bold py-2">
                          {kana.character}
                        </Kbd>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSubmit} className="flex justify-center">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onFocus={handleInputFocus}
                      className="max-w-2xl text-base md:text-2xl h-12 md:h-14"
                      style={{ fontSize: '16px' }}
                      autoFocus
                      disabled={isGameOver || enemyDefeated || enemyWillDie}
                    />
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="hidden md:flex flex-1 shrink-0"></div>
        </div>
      )
      }

      {/* Game Over Screen */}
      {
        isGameOver && (
          <GameOver
            enemiesDefeated={sessionState.enemiesDefeated}
            totalCorrect={sessionState.totalCorrect}
            totalAttempts={sessionState.totalAttempts}
            onRestart={handleRestart}
          />
        )
      }
    </div >
  );
}

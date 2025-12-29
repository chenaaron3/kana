import { useEffect, useRef, useState } from 'react';
import emptyHeart from '~/assets/hearts/empty.png';
import fullHeart from '~/assets/hearts/full.png';
import { Button } from '~/components/ui/8bit/button';
import { Card, CardContent } from '~/components/ui/8bit/card';
import { Input } from '~/components/ui/8bit/input';
import { Kbd } from '~/components/ui/8bit/kbd';
import hiraganaWords from '~/data/hiragana.json';
import { allKanaCharacters } from '~/data/kana';
import katakanaWords from '~/data/katakana.json';
import { getNextKana, initializeKanaCard, reviewKana } from '~/utils/fsrs';
import { loadProgress, saveProgress } from '~/utils/storage';
import { getNextWord } from '~/utils/wordBank';

import Enemy from './Enemy';
import GameOver from './GameOver';
import Player from './Player';

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
  const [combo, setCombo] = useState<number>(0); // Track consecutive correct answers
  const [promptStartTime, setPromptStartTime] = useState<number>(Date.now()); // Track when prompt was shown
  const [currentProjectileType, setCurrentProjectileType] = useState<'basic' | 'special'>('basic'); // Current projectile type

  const [currentPrompt, setCurrentPrompt] = useState<KanaCharacter[]>([]);
  const [currentWordString, setCurrentWordString] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [previousAnswer, setPreviousAnswer] = useState<PreviousAnswer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

      const promptLength = 3;
      const newPrompt: KanaCharacter[] = [];
      const usedIds = new Set<string>();

      for (let i = 0; i < promptLength && newPrompt.length < bottomKana.length; i++) {
        const remaining = bottomKana.filter((k) => !usedIds.has(k.id));
        if (remaining.length === 0) break;

        // Randomly select from bottom kana
        const randomIndex = Math.floor(Math.random() * remaining.length);
        const selected = remaining[randomIndex];
        if (selected) {
          newPrompt.push(selected);
          usedIds.add(selected.id);
        }
      }
      return newPrompt;
    }

    // Attack prompts: use normal logic
    // Try word mode first
    const wordKana = getNextWord(availableKana, cards);
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
    // Switch when promptAttempt is a multiple of enemy.attack (and > 0)
    let promptType: PromptType = 'attack';
    if (promptAttempt > 0 && promptAttempt % currentEnemy.attack === 0) {
      promptType = 'defense';
    }
    const prompt = generatePrompt(promptType, kanaCards);
    setPromptType(promptType);
    setCurrentPrompt(prompt);
    setUserInput("");
    setPromptStartTime(Date.now()); // Reset timer when new prompt is generated
  }, [promptAttempt, currentEnemy]);

  // Clear previousAnswer only when selectedKanaIds changes
  useEffect(() => {
    setPreviousAnswer(null);
  }, [sessionState.selectedKanaIds]);

  // Auto focus input when prompt changes
  useEffect(() => {
    if (currentPrompt.length > 0 && inputRef.current && !isGameOver) {
      inputRef.current.focus();
    }
  }, [currentPrompt, isGameOver]);

  // Handle enemy defeat - spawn new enemy
  useEffect(() => {
    if (enemyDefeated) {
      enemyRef.current?.playDie();

      setTimeout(() => {
        // Spawn new enemy and increment enemies defeated
        const newEnemy = generateNewEnemy();
        setCurrentEnemy(newEnemy);
        setPromptAttempt(0);
        setPromptType('attack');
        setEnemyDefeated(false);
        setSessionState((prev) => ({
          ...prev,
          enemiesDefeated: prev.enemiesDefeated + 1,
        }));
      }, 1000);
    }
  }, [enemyDefeated]);


  const playerAttack = (damage: number = 1, projectileType: 'basic' | 'special' = 'basic') => {
    setCurrentProjectileType(projectileType);
    playerRef.current?.playAttack();
    setTimeout(() => {
      const defeated = enemyRef.current?.playHit(damage) ?? false;
      if (defeated) {
        setEnemyDefeated(true);
      }
    }, 500);
  };

  // Calculate damage multiplier based on combo
  const getComboMultiplier = (comboCount: number): number => {
    if (comboCount >= 5) return 2.0;
    if (comboCount >= 3) return 1.5;
    return 1.0;
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
    if (currentPrompt.length === 0 || isGameOver) return;

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

    // Calculate response time and check for quick attack
    const responseTime = Date.now() - promptStartTime;
    const isQuickAttack = allCorrect && responseTime < 10000; // Less than 1 second

    // Handle attack vs defense prompts differently
    if (promptType === 'attack') {
      if (allCorrect) {
        // Correct attack - calculate damage with combo multiplier
        const newCombo = combo + 1;
        setCombo(newCombo);
        const damageMultiplier = getComboMultiplier(newCombo);
        const damage = Math.ceil(1 * damageMultiplier);

        // Use special projectile for quick attacks
        const projectileType = isQuickAttack ? 'special' : 'basic';
        playerAttack(damage, projectileType);
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
        setPlayerLives((prev) => Math.min(3, prev + 1));
      } else {
        // Failed defense - reset combo and enemy attacks
        setCombo(0);
        enemyAttack();
      }
    }

    // Note: New prompt will be generated by useEffect when promptType or other dependencies change
    setUserInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && currentPrompt.length > 0 && !isGameOver) {
      checkAnswers(userInput);
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

  if (currentPrompt.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header Bar - Always visible with Back button and Previous Answer */}
      <div className={`sticky top-0 z-10 border-b ${previousAnswer
        ? previousAnswer.isCorrect
          ? "bg-green-600 border-green-600"
          : "bg-red-600 border-red-600"
        : "bg-card border-border"
        }`} style={!previousAnswer ? { backgroundColor: 'hsl(var(--card))' } : undefined}>
        <div className="relative mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <Button
              onClick={onBack}
              variant={previousAnswer ? "ghost" : "outline"}
              className={previousAnswer ? "text-white hover:bg-white/20 border-white" : ""}
            >
              Back
            </Button>

            {/* Previous Answer - Absolutely centered */}
            {previousAnswer && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-xl font-semibold">
                    {previousAnswer.kana.map(k => k.character).join('')} = {previousAnswer.kana.map(k => k.romaji[0]).join('')}
                  </span>
                  {previousAnswer.isCorrect && (
                    <span className="text-2xl">✓</span>
                  )}
                </div>
                {previousAnswer.isCorrect && previousAnswer.translation && (
                  <div className="text-sm text-white/80">
                    Translation: {previousAnswer.translation}
                  </div>
                )}
                {!previousAnswer.isCorrect && (
                  <div className="text-sm text-white">
                    You typed: <span className="font-mono font-semibold">{previousAnswer.userInput}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Quiz Area */}
      {!isGameOver && (
        <div className="relative flex-1 flex items-center justify-center min-h-0">
          {/* Player and Enemy - positioned above prompt */}
          <div className="absolute top-0 left-0 right-0 flex items-end h-64 px-4 pointer-events-none">
            <div className="w-full max-w-4xl mx-auto flex">
              {/* Player on the left half */}
              <div className="flex-1 flex justify-center items-end h-full">
                <Player
                  ref={playerRef}
                  isActive={promptType === 'attack'}
                  enemySpriteRef={enemyRef.current ? { current: enemyRef.current.getSpriteElement() } as React.RefObject<HTMLElement | null> : undefined}
                  projectileType={currentProjectileType}
                  combo={combo}
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

          {/* Current Prompt - absolutely centered */}
          <div className="w-full max-w-2xl px-4">
            <Card>
              <CardContent className="relative pt-6">
                {/* Player Lives Display - top left */}
                {playerLives !== undefined && (
                  <div className="absolute top-4 left-4 flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <img
                        key={i}
                        src={i < playerLives ? fullHeart : emptyHeart}
                        alt={i < playerLives ? "Full heart" : "Empty heart"}
                        className="w-6 h-6"
                        style={{
                          imageRendering: 'pixelated'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Accuracy in top right */}
                {sessionState.totalAttempts > 0 && (
                  <div className="absolute top-4 right-4 text-sm text-muted-foreground">
                    {sessionState.totalCorrect} / {sessionState.totalAttempts}
                  </div>
                )}
                <div className="space-y-6 text-center">
                  <div className="flex items-center justify-center flex-wrap">
                    {currentPrompt.map((kana, index) => (
                      <Kbd key={index} className="text-5xl font-bold py-2">
                        {kana.character}
                      </Kbd>
                    ))}
                  </div>
                  <form onSubmit={handleSubmit} className="flex justify-center">
                    <Input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="max-w-2xl text-2xl h-14"
                      autoFocus
                      disabled={isGameOver}
                    />
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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

import { useEffect, useRef, useState } from 'react';
import { Badge } from '~/components/ui/8bit/badge';
import { Button } from '~/components/ui/8bit/button';
import { Card, CardContent } from '~/components/ui/8bit/card';
import { Input } from '~/components/ui/8bit/input';
import { Kbd } from '~/components/ui/8bit/kbd';
import { allKanaCharacters } from '~/data/kana';
import { getNextKana, initializeKanaCard, reviewKana } from '~/utils/fsrs';
import { loadProgress, saveProgress } from '~/utils/storage';

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
    defense: Math.floor(Math.random() * 3) + 1, // 1-3
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
  const [userInput, setUserInput] = useState("");
  const [previousAnswer, setPreviousAnswer] = useState<PreviousAnswer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const enemyRef = useRef<EnemyRef>(null);
  const playerRef = useRef<PlayerRef>(null);

  // Get available kana based on selection
  const availableKana = allKanaCharacters.filter((k) =>
    sessionState.selectedKanaIds.includes(k.id),
  );

  // Generate prompt based on type and current state
  const generatePrompt = (type: PromptType, cards: Record<string, KanaCard>): KanaCharacter[] => {
    const promptLength = type === 'attack'
      ? 1 + sessionState.enemiesDefeated // Starts at 1, increases by 1 per enemy defeated
      : sessionState.enemiesDefeated + currentEnemy.defense; // Fixed length from enemy stat

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
    const newPrompt = generatePrompt(promptType, kanaCards);
    setPromptType(promptType);
    setCurrentPrompt(newPrompt);
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
        setCombo(0); // Reset combo when new enemy spawns
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

    // Try to match the input string against all romaji in sequence
    let inputIndex = 0;
    let allCorrect = true;
    let correctCount = 0;
    const updatedKanaCards: Record<string, KanaCard> = {};

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

    // Store the previous answer
    setPreviousAnswer({
      kana: currentPrompt,
      userInput: input,
      isCorrect: allCorrect,
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
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-xl font-semibold">
                    {previousAnswer.kana.map(k => k.character).join('')} = {previousAnswer.kana.map(k => k.romaji[0]).join('')}
                  </span>
                  {previousAnswer.isCorrect && (
                    <span className="text-2xl">✓</span>
                  )}
                </div>
                {!previousAnswer.isCorrect && (
                  <div className="text-sm text-white">
                    You typed: <span className="font-mono font-semibold">{previousAnswer.userInput}</span>
                  </div>
                )}
              </div>
            )}

            {/* Spacer for right side */}
            <div className="w-[140px]" />
          </div>
        </div>
      </div>

      {/* Main Quiz Area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl space-y-8">
          {/* Combo Meter */}
          {combo > 0 && (
            <div className="flex items-center justify-center gap-2">
              <Badge className="text-lg font-bold px-4 py-2 retro">
                COMBO x{combo}
              </Badge>
              {combo >= 3 && (
                <Badge className={`text-sm font-semibold px-3 py-1 ${combo >= 5 ? 'bg-purple-600' : 'bg-blue-600'}`}>
                  {combo >= 5 ? '2x DMG' : '1.5x DMG'}
                </Badge>
              )}
            </div>
          )}

          {/* Player and Enemy above prompt box */}
          <div className="relative flex items-end w-full h-64">
            {/* Player on the left half */}
            <div className="flex-1 flex justify-center items-end h-full">
              <Player
                ref={playerRef}
                lives={playerLives}
                isActive={promptType === 'attack'}
                enemySpriteRef={enemyRef.current ? { current: enemyRef.current.getSpriteElement() } as React.RefObject<HTMLElement | null> : undefined}
                projectileType={currentProjectileType}
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

          {/* Current Prompt */}
          <Card>
            <CardContent className="relative pt-6">
              {/* Prompt Type Indicator */}
              <div className="absolute top-4 left-4">
                <Badge
                  className={`text-sm font-semibold px-3 py-1 ${promptType === 'attack'
                    ? 'text-blue-600'
                    : 'text-red-600 '
                    }`}
                >
                  {promptType === 'attack' ? 'ATTACK' : 'DEFEND'}
                </Badge>
              </div>

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

      {/* Game Over Screen */}
      {isGameOver && (
        <GameOver
          enemiesDefeated={sessionState.enemiesDefeated}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

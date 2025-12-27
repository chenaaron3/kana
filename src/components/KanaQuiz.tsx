import { useEffect, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Progress } from '~/components/ui/progress';
import { allKanaCharacters } from '~/data/kana';
import { getNextKana, initializeKanaCard, reviewKana } from '~/utils/fsrs';
import { loadProgress, saveProgress } from '~/utils/storage';

import type { KanaCharacter } from '~/data/kana';
import type { Session, PreviousAnswer, KanaCard } from "~/types/progress";

interface KanaQuizProps {
  session: Session;
  onBack: () => void;
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

  const [currentLevelSet, setCurrentLevelSet] = useState<KanaCharacter[]>([]);
  const [userInput, setUserInput] = useState("");
  const [previousAnswer, setPreviousAnswer] = useState<PreviousAnswer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get available kana based on selection
  const availableKana = allKanaCharacters.filter((k) =>
    sessionState.selectedKanaIds.includes(k.id),
  );

  // Initialize current level set when level changes
  useEffect(() => {
    const newSet = generateNewLevelSet(sessionState.level, kanaCards);
    setCurrentLevelSet(newSet);
    setUserInput("");
    setPreviousAnswer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState.level, sessionState.selectedKanaIds]);

  // Auto focus input when level set changes
  useEffect(() => {
    if (currentLevelSet.length > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentLevelSet]);

  const generateNewLevelSet = (level: number, cards: Record<string, KanaCard>) => {
    const newSet: KanaCharacter[] = [];
    for (let i = 0; i < level && newSet.length < availableKana.length; i++) {
      const remaining = availableKana.filter((k) => !newSet.some((c) => c.id === k.id));
      if (remaining.length === 0) break;
      const next = getNextKana(remaining, cards);
      if (next) {
        newSet.push(next);
      } else {
        const random = remaining[Math.floor(Math.random() * remaining.length)];
        if (random) newSet.push(random);
      }
    }
    return newSet;
  };

  const checkAnswers = (input: string) => {
    if (currentLevelSet.length === 0) return;

    const normalizedInput = input.trim().toLowerCase();
    if (!normalizedInput) return;

    // Try to match the input string against all romaji in sequence
    // We'll try to match each kana's romaji starting from the beginning
    let inputIndex = 0;
    let allCorrect = true;
    let correctCount = 0;
    const updatedKanaCards: Record<string, KanaCard> = {};

    // Check each kana by trying to match its romaji from current input position
    currentLevelSet.forEach((kana) => {
      // Create regex pattern from all possible romaji for this kana
      // Escape special regex characters and sort by length (longest first) for proper matching
      const sortedRomaji = [...kana.romaji]
        .map((r) => r.toLowerCase())
        .sort((a, b) => b.length - a.length);

      // Escape special regex characters in romaji
      const escapedRomaji = sortedRomaji.map((r) =>
        r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );

      // Create regex pattern: match any of the romaji at the start of remaining input
      const pattern = new RegExp(`^(${escapedRomaji.join("|")})`, "i");
      const remainingInput = normalizedInput.substring(inputIndex);
      const match = remainingInput.match(pattern);

      let matched = false;
      let matchedRomaji = "";

      if (match) {
        // Found a match
        matched = true;
        matchedRomaji = match[1]!;
        inputIndex += matchedRomaji.length;
      } else {
        // No match found - extract what the user typed (up to max romaji length)
        const maxRomajiLength = Math.max(...kana.romaji.map((r) => r.length));
        const endIndex = Math.min(
          inputIndex + maxRomajiLength,
          normalizedInput.length,
        );
        matchedRomaji = normalizedInput.substring(inputIndex, endIndex);
        // Advance by at least 1 character to avoid infinite loop
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
    const newTotalAttempts = sessionState.totalAttempts + currentLevelSet.length;

    // Store the previous answer with all kana characters and full user input
    setPreviousAnswer({
      kana: currentLevelSet,
      userInput: input, // Store the original input (not normalized)
      isCorrect: allCorrect,
    });

    // Update level progression
    let newLevelProgress = sessionState.levelProgress;
    let newLevel = sessionState.level;

    if (allCorrect) {
      // All correct - increase progress
      newLevelProgress = sessionState.levelProgress + 1;

      if (newLevelProgress >= 10) {
        newLevel = sessionState.level + 1;
        newLevelProgress = 0;
      }
    } else {
      // Not all correct - decrease progress (but don't go below 0)
      // Once a level is reached, it cannot be demoted - progress just floors at 0
      newLevelProgress = Math.max(0, sessionState.levelProgress - 1);
    }

    // Update kanaCards state and save to persistent storage
    const finalKanaCards = { ...kanaCards, ...updatedKanaCards };
    setKanaCards(finalKanaCards);
    saveProgress({ kanaCards: finalKanaCards });

    // Update session state
    setSessionState((prev) => ({
      ...prev,
      levelProgress: newLevelProgress,
      level: newLevel,
      totalCorrect: newTotalCorrect,
      totalAttempts: newTotalAttempts,
    }));

    // Generate new level set immediately
    const newSet = generateNewLevelSet(newLevel, finalKanaCards);
    setCurrentLevelSet(newSet);
    setUserInput("");
    // Keep previousAnswer until next submission (it will be updated on next checkAnswers call)
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && currentLevelSet.length > 0) {
      checkAnswers(userInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  if (currentLevelSet.length === 0) {
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
        }`}>
        <div className="relative mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <Button
              onClick={onBack}
              variant={previousAnswer ? "ghost" : "outline"}
              className={previousAnswer ? "text-white hover:bg-white/20 border-white" : ""}
            >
              Back to Selection
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
          {/* Current Prompt */}
          <Card>
            <CardContent className="relative pt-6">
              {/* Accuracy in top right */}
              {sessionState.totalAttempts > 0 && (
                <div className="absolute top-4 right-4 text-sm text-muted-foreground">
                  {sessionState.totalCorrect} / {sessionState.totalAttempts}
                </div>
              )}
              <div className="space-y-6 text-center">
                <div className="text-5xl font-bold">
                  {currentLevelSet.map((kana) => kana.character).join('')}
                </div>
                <form onSubmit={handleSubmit} className="flex justify-center">
                  <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Type romaji for ${currentLevelSet.length} characters...`}
                    className="max-w-2xl text-2xl h-14"
                    autoFocus
                  />
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Level Progression */}
          <div className="relative">
            <Progress value={(sessionState.levelProgress / 10) * 100} className="h-8" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold">Stage {sessionState.level}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


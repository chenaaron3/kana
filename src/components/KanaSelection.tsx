import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import {
    allKanaGroups, hiraganaCombinationGroups, hiraganaGroups, katakanaCombinationGroups,
    katakanaGroups
} from '~/data/kana';
import { loadProgress, loadSelectedGroups, saveSelectedGroups } from '~/utils/storage';

import type { KanaGroup } from '~/data/kana';
import type { KanaCard } from '~/types/progress';

interface KanaSelectionProps {
  onStart: (selectedKanaIds: string[]) => void;
}

export default function KanaSelection({ onStart }: KanaSelectionProps) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => {
    return loadSelectedGroups();
  });
  const [kanaCards, setKanaCards] = useState<Record<string, KanaCard> | null>(null);

  useEffect(() => {
    const saved = loadProgress();
    setKanaCards(saved?.kanaCards ?? null);
  }, []);

  // Save selected groups to localStorage whenever they change
  useEffect(() => {
    saveSelectedGroups(selectedGroups);
  }, [selectedGroups]);

  const toggleGroup = (groupName: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupName)) {
      newSelected.delete(groupName);
    } else {
      newSelected.add(groupName);
    }
    setSelectedGroups(newSelected);
  };

  const toggleAll = (groups: KanaGroup[], checked: boolean) => {
    setSelectedGroups((prev) => {
      const newSelected = new Set(prev);
      groups.forEach((group) => {
        const groupKey = `${group.name}-${group.characters[0]?.type ?? ""}`;
        if (checked) {
          newSelected.add(groupKey);
        } else {
          newSelected.delete(groupKey);
        }
      });
      return newSelected;
    });
  };


  const handleStart = () => {
    const selectedKanaIds: string[] = [];
    allKanaGroups.forEach((group) => {
      const groupKey = `${group.name}-${group.characters[0]?.type ?? ""}`;
      if (selectedGroups.has(groupKey)) {
        group.characters.forEach((char) => {
          selectedKanaIds.push(char.id);
        });
      }
    });

    if (selectedKanaIds.length === 0) {
      alert("Please select at least one group to start!");
      return;
    }

    onStart(selectedKanaIds);
  };

  /**
   * Get color based on accuracy percentage
   * - 0% (new/unseen): Gray
   * - 0-50%: Red (struggling)
   * - 50-80%: Yellow (learning)
   * - 80-100%: Green (mastered)
   */
  const getAccuracyColor = (kanaId: string): string => {
    const stats = getKanaStats(kanaId);
    if (!stats || stats.reps === 0) {
      // New/unseen card
      return "bg-gray-300";
    }

    const accuracy = stats.accuracy;

    if (accuracy < 50) {
      // 0-49%: Red (struggling)
      return "bg-red-400";
    } else if (accuracy < 80) {
      // 50-79%: Yellow (learning)
      return "bg-yellow-400";
    } else {
      // 80-100%: Green (mastered)
      return "bg-green-400";
    }
  };

  const getKanaStats = (kanaId: string) => {
    if (!kanaCards) return null;
    const kanaCard: KanaCard | undefined = kanaCards[kanaId];
    if (!kanaCard) return null;

    const card = kanaCard.card;
    // Use our tracked counters if available, otherwise fall back to FSRS counters
    const totalShown = kanaCard.totalShown ?? 0;
    const totalCorrect = kanaCard.totalCorrect ?? 0;
    const accuracy = totalShown > 0 ? Math.round((totalCorrect / totalShown) * 100) : 0;

    // Calculate days since last review
    // Use kanaCard.lastReview (timestamp) if available, otherwise use card.last_review
    // Handle both Date objects and serialized dates (strings/numbers)
    let lastReviewTime: number | null = null;
    if (kanaCard.lastReview) {
      lastReviewTime = kanaCard.lastReview;
    } else if (card.last_review) {
      if (card.last_review instanceof Date) {
        lastReviewTime = card.last_review.getTime();
      } else if (typeof card.last_review === 'string') {
        lastReviewTime = new Date(card.last_review).getTime();
      } else if (typeof card.last_review === 'number') {
        lastReviewTime = card.last_review;
      }
    }
    const daysSinceLastReview = lastReviewTime
      ? Math.floor((Date.now() - lastReviewTime) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate days until due
    // Handle both Date objects and serialized dates (strings/numbers)
    const dueTime = card.due
      ? (card.due instanceof Date ? card.due.getTime() : typeof card.due === 'string' ? new Date(card.due).getTime() : card.due)
      : null;
    const daysUntilDue = dueTime
      ? Math.ceil((dueTime - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Get state name
    const stateNames = ['New', 'Learning', 'Review', 'Relearning'];
    const stateName = stateNames[card.state] ?? 'Unknown';

    return {
      // Our tracked stats
      reps: totalShown,
      correct: totalCorrect,
      accuracy,
      // FSRS card data
      fsrsReps: card.reps,
      fsrsLapses: card.lapses,
      stability: Math.round(card.stability * 10) / 10,
      difficulty: Math.round(card.difficulty * 10) / 10,
      state: stateName,
      scheduledDays: Math.round(card.scheduled_days * 10) / 10,
      learningSteps: card.learning_steps,
      // Timing info
      daysSinceLastReview,
      daysUntilDue,
    };
  };

  const renderKanaTooltip = (kanaId: string) => {
    const stats = getKanaStats(kanaId);
    if (!stats) {
      return (
        <div className="space-y-1">
          <div className="font-semibold">New</div>
          <div className="text-xs text-gray-300">Not yet reviewed</div>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 text-left max-w-xs">
        <div className="font-semibold border-b border-gray-700 pb-1">Statistics</div>
        <div className="space-y-0.5 text-xs">
          <div>Shown: <span className="font-semibold">{stats.reps}</span> times</div>
          <div>Correct: <span className="font-semibold">{stats.correct}</span> times</div>
          <div>Accuracy: <span className="font-semibold">{stats.accuracy}%</span></div>
        </div>
        <div className="border-t border-gray-700 pt-1 space-y-0.5 text-xs">
          <div>State: <span className="font-semibold">{stats.state}</span></div>
          <div>Stability: <span className="font-semibold">{stats.stability}</span></div>
          <div>Difficulty: <span className="font-semibold">{stats.difficulty}</span></div>
          <div>FSRS Reps: <span className="font-semibold">{stats.fsrsReps}</span></div>
          <div>FSRS Lapses: <span className="font-semibold">{stats.fsrsLapses}</span></div>
          <div>Scheduled Days: <span className="font-semibold">{stats.scheduledDays}</span></div>
          <div>Learning Steps: <span className="font-semibold">{stats.learningSteps}</span></div>
          {stats.daysSinceLastReview !== null && (
            <div>Last review: <span className="font-semibold">{stats.daysSinceLastReview}d ago</span></div>
          )}
          {stats.daysUntilDue !== null && stats.daysUntilDue > 0 && (
            <div>Due in: <span className="font-semibold">{stats.daysUntilDue}d</span></div>
          )}
          {stats.daysUntilDue !== null && stats.daysUntilDue <= 0 && (
            <div className="text-yellow-400">Due now</div>
          )}
        </div>
      </div>
    );
  };



  const renderKanaGrid = (groups: KanaGroup[]) => {
    // Find max characters in this specific set of groups
    const maxCharsInThisSet = Math.max(...groups.map((g) => g.characters.length));

    return (
      <div className="flex gap-1 overflow-x-auto pb-4">
        {groups.map((group) => {
          const groupKey = `${group.name}-${group.characters[0]?.type ?? ""}`;
          const isSelected = selectedGroups.has(groupKey);
          return (
            <div key={groupKey} className="flex min-w-[70px] flex-col">
              {/* Checkbox at top of column */}
              <div className="mb-1 flex justify-center">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleGroup(groupKey)}
                  className="h-4 w-4 cursor-pointer"
                />
              </div>
              {/* Characters in column */}
              <div className="flex flex-col gap-1">
                {group.characters.map((char) => {
                  const color = getAccuracyColor(char.id);
                  return (
                    <Tooltip key={char.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex min-h-[40px] flex-col items-center justify-center rounded-md border-2 transition-all cursor-help ${isSelected ? "border-primary" : "border-border"} ${color} p-1`}
                        >
                          <div className="text-lg font-bold">
                            {char.character}
                          </div>
                          <div className="text-xs text-muted-foreground">{char.romaji[0]}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="border-gray-700 max-w-xs">
                        {renderKanaTooltip(char.id)}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {/* Fill empty spaces if group has fewer characters */}
                {Array.from({ length: maxCharsInThisSet - group.characters.length }).map(
                  (_, idx) => (
                    <div key={`empty-${idx}`} className="min-h-[40px]"></div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b bg-amber-50 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">
                Select Kana to Practice
              </h1>
              <Button
                onClick={handleStart}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                Start Practice
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mx-auto max-w-7xl space-y-8">

            {/* Hiragana Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hiragana</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(hiraganaGroups, true)}
                    >
                      Check all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(hiraganaGroups, false)}
                    >
                      Uncheck all
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderKanaGrid(hiraganaGroups)}
              </CardContent>
            </Card>

            {/* Hiragana Combinations Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hiragana Combinations</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(hiraganaCombinationGroups, true)}
                    >
                      Check all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(hiraganaCombinationGroups, false)}
                    >
                      Uncheck all
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderKanaGrid(hiraganaCombinationGroups)}
              </CardContent>
            </Card>

            {/* Katakana Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Katakana</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(katakanaGroups, true)}
                    >
                      Check all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(katakanaGroups, false)}
                    >
                      Uncheck all
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderKanaGrid(katakanaGroups)}
              </CardContent>
            </Card>

            {/* Katakana Combinations Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Katakana Combinations</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(katakanaCombinationGroups, true)}
                    >
                      Check all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAll(katakanaCombinationGroups, false)}
                    >
                      Uncheck all
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderKanaGrid(katakanaCombinationGroups)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}


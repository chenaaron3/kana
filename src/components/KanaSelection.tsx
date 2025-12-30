import { useEffect, useState } from 'react';
import KanaChart from '~/components/KanaChart';
import KanaSectionCard from '~/components/KanaSectionCard';
import { Button } from '~/components/ui/8bit/button';
import { TooltipProvider } from '~/components/ui/tooltip';
import {
  allKanaGroups, hiraganaCombinationGroups, hiraganaGroups, katakanaCombinationGroups,
  katakanaGroups
} from '~/data/kana';
import { calculateWilsonConfidence } from '~/utils/fsrs';
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

    // Calculate Wilson confidence
    const wilsonConfidence = calculateWilsonConfidence(stats.correct, stats.reps);
    const wilsonConfidencePercent = Math.round(wilsonConfidence * 100);

    return (
      <div className="space-y-1.5 text-left max-w-xs">
        <div className="font-semibold border-b border-gray-700 pb-1">Statistics</div>
        <div className="space-y-0.5 text-xs">
          <div>Shown: <span className="font-semibold">{stats.reps}</span> times</div>
          <div>Correct: <span className="font-semibold">{stats.correct}</span> times</div>
          <div>Accuracy: <span className="font-semibold">{stats.accuracy}%</span></div>
          <div>Confidence: <span className="font-semibold">{wilsonConfidencePercent}%</span></div>
        </div>
      </div>
    );
  };


  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 border-b bg-amber-50 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="retro text-xl md:text-5xl font-bold tracking-tight">
                KANA DOJO
              </h1>
              <Button
                onClick={handleStart}
                className="text-xs md:text-base text-green-600 hover:text-green-700"
              >
                Start Practice
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-b bg-amber-50 px-4 py-3">
          <div className="mx-auto max-w-7xl">
            <div className="retro flex flex-wrap items-center justify-evenly md:justify-start gap-y-3 gap-x-6 md:gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-none border-2 border-foreground bg-green-400"></div>
                <span>MASTERED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-none border-2 border-foreground bg-yellow-400"></div>
                <span>LEARNING</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-none border-2 border-foreground bg-red-400"></div>
                <span>STRUGGLING</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-none border-2 border-foreground bg-gray-300"></div>
                <span>NEW</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-4 md:space-y-8">
            {/* Hiragana Section */}
            <KanaSectionCard
              title="Hiragana"
              groups={hiraganaGroups}
              selectedGroups={selectedGroups}
              kanaCards={kanaCards}
              onCheckAll={() => toggleAll(hiraganaGroups, true)}
              onClear={() => toggleAll(hiraganaGroups, false)}
              onToggleGroup={toggleGroup}
              getAccuracyColor={getAccuracyColor}
              renderKanaTooltip={renderKanaTooltip}
            />

            {/* Hiragana Combinations Section */}
            <KanaSectionCard
              title="Hiragana Combinations"
              groups={hiraganaCombinationGroups}
              selectedGroups={selectedGroups}
              kanaCards={kanaCards}
              onCheckAll={() => toggleAll(hiraganaCombinationGroups, true)}
              onClear={() => toggleAll(hiraganaCombinationGroups, false)}
              onToggleGroup={toggleGroup}
              getAccuracyColor={getAccuracyColor}
              renderKanaTooltip={renderKanaTooltip}
            />

            {/* Katakana Section */}
            <KanaSectionCard
              title="Katakana"
              groups={katakanaGroups}
              selectedGroups={selectedGroups}
              kanaCards={kanaCards}
              onCheckAll={() => toggleAll(katakanaGroups, true)}
              onClear={() => toggleAll(katakanaGroups, false)}
              onToggleGroup={toggleGroup}
              getAccuracyColor={getAccuracyColor}
              renderKanaTooltip={renderKanaTooltip}
            />

            {/* Katakana Combinations Section */}
            <KanaSectionCard
              title="Katakana Combinations"
              groups={katakanaCombinationGroups}
              selectedGroups={selectedGroups}
              kanaCards={kanaCards}
              onCheckAll={() => toggleAll(katakanaCombinationGroups, true)}
              onClear={() => toggleAll(katakanaCombinationGroups, false)}
              onToggleGroup={toggleGroup}
              getAccuracyColor={getAccuracyColor}
              renderKanaTooltip={renderKanaTooltip}
            />

            {/* Chart Section - Hidden on mobile */}
            <div className="hidden md:block">
              <KanaChart selectedGroups={selectedGroups} kanaCards={kanaCards} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}


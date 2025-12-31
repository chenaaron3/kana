import { useState } from "react";
import { initializeKanaCard } from "~/utils/fsrs";
import { loadProgress, saveProgress } from "~/utils/storage";

import type { KanaCard } from "~/types/progress";

interface UseKanaCardsProps {
  selectedKanaIds: string[];
}

export function useKanaCards({ selectedKanaIds }: UseKanaCardsProps) {
  const [kanaCards, setKanaCards] = useState<Record<string, KanaCard>>(() => {
    const saved = loadProgress();
    if (saved?.kanaCards) {
      return saved.kanaCards;
    }
    // Initialize kanaCards for selected kana
    const cards: Record<string, KanaCard> = {};
    selectedKanaIds.forEach((id) => {
      cards[id] ??= initializeKanaCard(id);
    });
    return cards;
  });

  const updateKanaCards = (updates: Record<string, KanaCard>) => {
    const finalKanaCards = { ...kanaCards, ...updates };
    setKanaCards(finalKanaCards);
    saveProgress({ kanaCards: finalKanaCards });
  };

  return {
    kanaCards,
    updateKanaCards,
  };
}

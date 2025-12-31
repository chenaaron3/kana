import { Button } from '~/components/ui/8bit/button';
import { Card, CardContent } from '~/components/ui/8bit/card';

import type { GameStore, GameStoreHook } from '~/store/gameStore';

interface GameOverProps {
  useStore: GameStoreHook;
  onRestart: () => void;
}

export default function GameOver({ useStore, onRestart }: GameOverProps) {
  const enemiesDefeated = useStore((state: GameStore) => state.sessionState.enemiesDefeated);
  const totalCorrect = useStore((state: GameStore) => state.sessionState.totalCorrect);
  const totalAttempts = useStore((state: GameStore) => state.sessionState.totalAttempts);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-red-600 retro">Game Over</h1>
            <div className="space-y-2">
              <p className="text-base md:text-xl text-muted-foreground">
                You defeated {enemiesDefeated} {enemiesDefeated === 1 ? 'enemy' : 'enemies'}
              </p>
              {totalAttempts > 0 && (
                <p className="text-sm text-muted-foreground">
                  Accuracy: {totalCorrect} / {totalAttempts}
                </p>
              )}
            </div>
            <Button onClick={onRestart} className="w-full" size="lg">
              Restart Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

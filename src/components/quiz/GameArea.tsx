import { useEffect, useRef } from 'react';
import { Card, CardContent } from '~/components/ui/8bit/card';
import { Input } from '~/components/ui/8bit/input';
import { Kbd } from '~/components/ui/8bit/kbd';

import Enemy from '../Enemy';
import Player from '../Player';
import PlayerStats from '../PlayerStats';

import type { GameStore, GameStoreHook } from '~/store/gameStore';

import type { EnemyRef } from '../Enemy';
import type { PlayerRef } from '../Player';

interface GameAreaProps {
  playerRef: React.RefObject<PlayerRef | null>;
  enemyRef: React.RefObject<EnemyRef | null>;
  onSubmit: (e: React.FormEvent) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  useStore: GameStoreHook;
}

export default function GameArea({
  playerRef,
  enemyRef,
  onSubmit,
  onKeyPress,
  useStore,
}: GameAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Get state from store
  const promptType = useStore((state: GameStore) => state.promptType);
  const currentEnemy = useStore((state: GameStore) => state.currentEnemy);
  const promptAttempt = useStore((state: GameStore) => state.promptAttempt);
  const combo = useStore((state: GameStore) => state.combo);
  const currentPrompt = useStore((state: GameStore) => state.currentPrompt);
  const userInput = useStore((state: GameStore) => state.userInput);
  const enemyWillDie = useStore((state: GameStore) => state.enemyWillDie);
  const isGameOver = useStore((state: GameStore) => state.isGameOver);
  const enemyDefeated = useStore((state: GameStore) => state.enemyDefeated);
  const playerLives = useStore((state: GameStore) => state.playerLives);
  const sessionState = useStore((state: GameStore) => state.sessionState);
  const manaTimeRemaining = useStore((state: GameStore) => state.manaTimeRemaining);

  // Get actions from store
  const setUserInput = useStore.getState().setUserInput;

  // Auto focus input when prompt changes
  useEffect(() => {
    if (currentPrompt.length > 0 && inputRef.current && !isGameOver && !enemyDefeated && !enemyWillDie) {
      inputRef.current.focus();
    }
  }, [currentPrompt, isGameOver, enemyDefeated, enemyWillDie]);

  return (
    <div className="fixed bottom-0 md:relative flex-1 flex flex-col min-h-0">
      {/* Player and Enemy - flex grow */}
      <div className="flex-1 flex items-end px-4 pointer-events-none min-h-0">
        <div className="w-full max-w-4xl mx-auto flex">
          {/* Player on the left half */}
          <div className="flex-1 flex justify-center items-end h-full">
            <Player
              ref={playerRef as React.RefObject<PlayerRef>}
              isActive={promptType === 'attack'}
              enemySpriteRef={enemyRef.current ? { current: enemyRef.current.getSpriteElement() } as React.RefObject<HTMLElement | null> : undefined}
              combo={combo}
              manaTimeRemaining={manaTimeRemaining}
              currentPromptLength={currentPrompt.length}
            />
          </div>

          {/* Enemy on the right half */}
          <div className="flex-1 flex justify-center items-end h-full">
            <Enemy
              ref={enemyRef as React.RefObject<EnemyRef>}
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
          <CardContent
            className={`relative p-3 md:p-6 ${enemyWillDie
              ? 'bg-blue-100'
              : promptType === 'defense'
                ? 'bg-red-100'
                : 'bg-white'
              }`}
          >
            {/* Player Stats - top corners (desktop) / inline (mobile) */}
            <PlayerStats
              playerLives={playerLives}
              totalCorrect={sessionState.totalCorrect}
              totalAttempts={sessionState.totalAttempts}
            />
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center flex-wrap min-h-[20px] md:min-h-[30px]">
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
              <form onSubmit={onSubmit} className="flex justify-center">
                <Input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={onKeyPress}
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
  );
}

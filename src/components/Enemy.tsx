import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '~/components/ui/8bit/avatar';
import HealthBar from '~/components/ui/8bit/health-bar';

import FloatingText from './FloatingText';

import type { EnemyStats } from '~/types/progress';

export type EnemyState = 'idle' | 'hit' | 'attack' | 'die' | 'heal' | 'miss';

export interface EnemyRef {
    playIdle: () => void;
    playHit: (amount: number) => boolean; // Returns true if enemy is defeated
    playAttack: () => void;
    playDie: () => void;
    playMiss: () => void; // Play miss animation and show floating miss text
    heal: (amount: number) => void; // Heal enemy by amount (up to max health)
    getContainerElement: () => HTMLElement | null; // Expose container DOM element
    getSpriteElement: () => HTMLElement | null; // Expose sprite DOM element
}

interface EnemyProps {
    enemy: EnemyStats;
    isActive?: boolean;
    turnsUntilAttack?: number;
}

// Import all frame images using Vite's glob import
// Sort by filename to ensure correct frame order (tile000, tile001, etc.)
const sortFrames = (frames: Record<string, any>): string[] => {
    return Object.entries(frames)
        .sort(([pathA], [pathB]) => {
            const filenameA = pathA.split('/').pop() || '';
            const filenameB = pathB.split('/').pop() || '';
            return filenameA.localeCompare(filenameB);
        })
        .map(([, url]) => url as string);
};

const idleFrames = sortFrames(
    import.meta.glob('~/assets/enemy/idle/*.png', { eager: true, import: 'default' })
);

const hitFrames = sortFrames(
    import.meta.glob('~/assets/enemy/hit/*.png', { eager: true, import: 'default' })
);

const attackFrames = sortFrames(
    import.meta.glob('~/assets/enemy/attack/*.png', { eager: true, import: 'default' })
);

const dieFrames = sortFrames(
    import.meta.glob('~/assets/enemy/die/*.png', { eager: true, import: 'default' })
);

const healFrames = sortFrames(
    import.meta.glob('~/assets/enemy/heal/*.png', { eager: true, import: 'default' })
);

const missFrames = sortFrames(
    import.meta.glob('~/assets/enemy/miss/*.png', { eager: true, import: 'default' })
);

// Animation configuration
const ANIMATION_CONFIG = {
    idle: { frames: idleFrames.length, fps: 8 },
    hit: { frames: hitFrames.length, fps: 10 },
    attack: { frames: attackFrames.length, fps: 10 },
    die: { frames: dieFrames.length, fps: 8 },
    heal: { frames: healFrames.length, fps: 10 },
    miss: { frames: missFrames.length, fps: 10 },
};

const Enemy = forwardRef<EnemyRef, EnemyProps>(({ enemy, isActive = false, turnsUntilAttack }, ref) => {
    const [state, setState] = useState<EnemyState>('idle');
    const [currentFrame, setCurrentFrame] = useState(0);
    const [currentHealth, setCurrentHealth] = useState<number>(enemy.health);
    const [missPosition, setMissPosition] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const spriteRef = useRef<HTMLImageElement>(null);
    const config = ANIMATION_CONFIG[state];

    // Reset health when enemy changes (new enemy spawned)
    useEffect(() => {
        setCurrentHealth(enemy.health);
    }, [enemy]);

    // Expose imperative API via ref
    useImperativeHandle(ref, () => ({
        playIdle: () => {
            setState('idle');
        },
        playHit: (amount: number) => {
            const willBeDefeated = currentHealth - amount <= 0;
            setCurrentHealth((prev) => Math.max(0, prev - amount));
            setState('hit');
            return willBeDefeated;
        },
        playAttack: () => {
            setState('attack');
        },
        playDie: () => {
            setState('die');
        },
        playMiss: () => {
            setState('miss');
            // Show floating miss text
            if (spriteRef.current && containerRef.current) {
                const spriteRect = spriteRef.current.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                setMissPosition({
                    x: spriteRect.left + spriteRect.width / 2 - containerRect.left,
                    y: spriteRect.top + spriteRect.height / 2 - containerRect.top - 20,
                });
            }
        },
        heal: (amount: number) => {
            setCurrentHealth((prev) => Math.min(enemy.health, prev + amount));
            setState('heal');
        },
        getContainerElement: () => containerRef.current,
        getSpriteElement: () => spriteRef.current,
    }), [currentHealth, enemy.health]);

    // Clamp currentFrame to valid range for current state
    const safeFrame = useMemo(() => {
        const maxFrame = config.frames - 1;
        return Math.max(0, Math.min(currentFrame, maxFrame));
    }, [currentFrame, config.frames]);

    // Get the current frame image based on state with bounds checking
    const getCurrentFrameImage = () => {
        const frames = (() => {
            switch (state) {
                case 'hit':
                    return hitFrames;
                case 'attack':
                    return attackFrames;
                case 'die':
                    return dieFrames;
                case 'heal':
                    return healFrames;
                case 'miss':
                    return missFrames;
                default:
                    return idleFrames;
            }
        })();

        // Use the safe frame index
        return frames[safeFrame] || frames[0] || '';
    };

    useEffect(() => {
        // Reset frame when state changes - do this synchronously
        setCurrentFrame(0);

        // For non-idle animations, set up timer to cycle frames
        if (state !== 'idle') {
            const frameInterval = 1000 / config.fps;
            const totalFrames = config.frames;

            const interval = setInterval(() => {
                setCurrentFrame((prev) => {
                    const next = prev + 1;
                    if (next >= totalFrames) {
                        clearInterval(interval);
                        // Automatically return to idle after animation completes
                        setState('idle');
                        return Math.max(0, totalFrames - 1); // Stay on last valid frame
                    }
                    return next;
                });
            }, frameInterval);

            return () => clearInterval(interval);
        } else {
            // Idle animation loops continuously
            const frameInterval = 1000 / config.fps;
            const totalFrames = config.frames;

            const interval = setInterval(() => {
                setCurrentFrame((prev) => {
                    const next = (prev + 1) % totalFrames;
                    return next;
                });
            }, frameInterval);

            return () => clearInterval(interval);
        }
    }, [state, config.fps, config.frames]);

    const currentImage = getCurrentFrameImage();

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-2 relative">
            {/* Health Bar */}
            <div className="w-full max-w-[150px] relative">
                {/* Turn Countdown Badge */}
                {turnsUntilAttack !== undefined && !isActive && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10">
                        <Avatar variant="retro" className="w-10 h-10 rounded-none">
                            <AvatarFallback className="bg-red-600 text-white text-lg font-bold retro border-2 border-white rounded-none">
                                {turnsUntilAttack}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                )}
                <HealthBar
                    value={(currentHealth / enemy.health) * 100}
                    className="w-full"
                />
            </div>

            {/* Enemy Sprite */}
            <div
                className={`flex justify-center items-end overflow-visible relative transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]' : ''
                    }`}
                style={{ width: '150px', height: '75px' }}
            >
                <img
                    ref={spriteRef}
                    src={currentImage}
                    alt={`Enemy ${state}`}
                    className={`transition-transform duration-500 ease-in-out ${state === 'attack' ? '-translate-x-20' : ''
                        }`}
                    style={{
                        imageRendering: 'pixelated', // For crisp pixel art
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                    }}
                />
            </div>
            {missPosition && (
                <FloatingText
                    text="MISS"
                    x={missPosition.x}
                    y={missPosition.y}
                    color="text-red-600"
                    onComplete={() => setMissPosition(null)}
                />
            )}
        </div>
    );
});

Enemy.displayName = 'Enemy';

export default Enemy;

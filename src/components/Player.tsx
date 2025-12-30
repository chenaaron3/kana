import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '~/components/ui/8bit/avatar';
import ManaBar from '~/components/ui/8bit/mana-bar';
import { getComboConfig } from '~/constants';

import Fire from './Fire';
import FloatingText from './FloatingText';
import Projectile from './Projectile';

export type PlayerState = 'idle' | 'hit' | 'attack' | 'heal';

export interface PlayerRef {
    playIdle: () => void;
    playHit: () => void;
    playAttack: () => void;
    playHeal: () => void;
    miss: () => void;
}

interface PlayerProps {
    isActive?: boolean;
    enemySpriteRef?: React.RefObject<HTMLElement | null>;
    projectileType?: 'basic' | 'special'; // Type of projectile to use
    combo?: number; // Combo count for fire effect
    manaTimeRemaining?: number; // Time remaining in milliseconds
}

// Import all frame images using Vite's glob import
// Sort by filename to ensure correct frame order
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
    import.meta.glob('~/assets/player/idle/*.png', { eager: true, import: 'default' })
);

const hitFrames = sortFrames(
    import.meta.glob('~/assets/player/hit/*.png', { eager: true, import: 'default' })
);

const attackFrames = sortFrames(
    import.meta.glob('~/assets/player/attack/*.png', { eager: true, import: 'default' })
);

const healFrames = sortFrames(
    import.meta.glob('~/assets/player/heal/*.png', { eager: true, import: 'default' })
);

// Animation configuration
const ANIMATION_CONFIG = {
    idle: { frames: idleFrames.length, fps: 8 },
    hit: { frames: hitFrames.length, fps: 10 },
    attack: { frames: attackFrames.length, fps: 10 },
    heal: { frames: healFrames.length, fps: 10 },
};

const Player = forwardRef<PlayerRef, PlayerProps>(({ isActive = false, enemySpriteRef, projectileType = 'basic', combo = 0, manaTimeRemaining = 0 }, ref) => {
    const [state, setState] = useState<PlayerState>('idle');
    const [currentFrame, setCurrentFrame] = useState(0);
    const [showProjectile, setShowProjectile] = useState(false);
    const [missPosition, setMissPosition] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const spriteRef = useRef<HTMLImageElement>(null);
    const config = ANIMATION_CONFIG[state];

    // Expose imperative API via ref
    useImperativeHandle(ref, () => ({
        playIdle: () => {
            setState('idle');
            setShowProjectile(false);
        },
        playHit: () => {
            setState('hit');
            setShowProjectile(false);
        },
        playAttack: () => {
            setState('attack');
            // Delay projectile to allow for attack wind-up animation
            setTimeout(() => {
                setShowProjectile(true);
            }, 200);
        },
        playHeal: () => {
            setState('heal');
            setShowProjectile(false);
        },
        miss: () => {
            if (spriteRef.current && containerRef.current) {
                const spriteRect = spriteRef.current.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                setMissPosition({
                    x: spriteRect.left + spriteRect.width / 2 - containerRect.left,
                    y: spriteRect.top + spriteRect.height / 2 - containerRect.top - 20,
                });
            }
        },
    }));

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
                case 'heal':
                    return healFrames;
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
    const comboConfig = getComboConfig(combo);
    const hasEffect = comboConfig.multiplier > 1;
    const manaPercentage = manaTimeRemaining ? (manaTimeRemaining / comboConfig.timerMs) * 100 : 0;

    return (
        <div ref={containerRef} className="flex flex-col items-center gap-2 justify-end relative w-full h-full">
            {/* Mana Bar - positioned absolutely */}
            {combo > 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[150px]">
                    <div className="relative pl-5">
                        {/* Combo Avatar */}
                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10">
                            <Avatar variant="retro" className="w-10 h-10 rounded-none">
                                <AvatarFallback className="bg-blue-700 text-white text-lg font-bold retro border-2 border-white rounded-none">
                                    {combo}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <ManaBar
                            value={manaPercentage}
                            className="w-full"
                        />
                    </div>
                </div>
            )}
            <div
                className={`relative transition-all duration-300 ${isActive
                    ? 'drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]'
                    : ''
                    }`}
                style={{
                    width: '50px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                }}
            >
                {/* Fire Effect - positioned relative to player sprite */}
                {hasEffect && <Fire combo={combo} />}
                <img
                    ref={spriteRef}
                    src={currentImage}
                    alt={`Player ${state}`}
                    style={{
                        imageRendering: 'pixelated', // For crisp pixel art
                        transform: 'scale(4) translateY(-40%)', // Scale and translate up 50%
                        height: 'auto',
                        width: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                    }}
                />
            </div>
            {showProjectile && (
                <Projectile
                    onComplete={() => setShowProjectile(false)}
                    enemySpriteRef={enemySpriteRef}
                    playerContainerRef={containerRef}
                    type={projectileType}
                />
            )}
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

Player.displayName = 'Player';

export default Player;


import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

export type EnemyState = 'idle' | 'hit' | 'attack' | 'die';

export interface EnemyRef {
    playIdle: () => void;
    playHit: () => void;
    playAttack: () => void;
    playDie: () => void;
}

interface EnemyProps {
    // No props needed - state is managed internally
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

// Animation configuration
const ANIMATION_CONFIG = {
    idle: { frames: idleFrames.length, fps: 8 },
    hit: { frames: hitFrames.length, fps: 10 },
    attack: { frames: attackFrames.length, fps: 10 },
    die: { frames: dieFrames.length, fps: 8 },
};

const Enemy = forwardRef<EnemyRef, EnemyProps>((_props, ref) => {
    const [state, setState] = useState<EnemyState>('idle');
    const [currentFrame, setCurrentFrame] = useState(0);
    const config = ANIMATION_CONFIG[state];

    // Expose imperative API via ref
    useImperativeHandle(ref, () => ({
        playIdle: () => {
            setState('idle');
        },
        playHit: () => {
            setState('hit');
        },
        playAttack: () => {
            setState('attack');
        },
        playDie: () => {
            setState('die');
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
                case 'die':
                    return dieFrames;
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
        <div className="flex justify-center items-end overflow-hidden" style={{ width: '150px', height: '150px' }}>
            <img
                src={currentImage}
                alt={`Enemy ${state}`}
                style={{
                    imageRendering: 'pixelated', // For crisp pixel art
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                }}
            />
        </div>
    );
});

Enemy.displayName = 'Enemy';

export default Enemy;

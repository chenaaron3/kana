import { useEffect, useState } from 'react';

interface FireProps {
    combo: number;
    onComplete?: () => void;
}

// Import all fire frame images using Vite's glob import
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

const basicStartFrames = sortFrames(
    import.meta.glob('~/assets/fire/basic/start/*.png', { eager: true, import: 'default' })
);
const basicLoopFrames = sortFrames(
    import.meta.glob('~/assets/fire/basic/loop/*.png', { eager: true, import: 'default' })
);
const basicEndFrames = sortFrames(
    import.meta.glob('~/assets/fire/basic/end/*.png', { eager: true, import: 'default' })
);

const specialStartFrames = sortFrames(
    import.meta.glob('~/assets/fire/special/start/*.png', { eager: true, import: 'default' })
);
const specialLoopFrames = sortFrames(
    import.meta.glob('~/assets/fire/special/loop/*.png', { eager: true, import: 'default' })
);
const specialEndFrames = sortFrames(
    import.meta.glob('~/assets/fire/special/end/*.png', { eager: true, import: 'default' })
);

type FireState = 'start' | 'loop' | 'end' | 'hidden';

const Fire = ({ combo, onComplete }: FireProps) => {
    const [state, setState] = useState<FireState>(combo >= 3 ? 'start' : 'hidden');
    const [currentFrame, setCurrentFrame] = useState(0);
    const [previousCombo, setPreviousCombo] = useState(combo);

    // Determine fire type based on combo
    const fireType = combo >= 7 ? 'special' : 'basic';
    const startFrames = fireType === 'special' ? specialStartFrames : basicStartFrames;
    const loopFrames = fireType === 'special' ? specialLoopFrames : basicLoopFrames;
    const endFrames = fireType === 'special' ? specialEndFrames : basicEndFrames;

    // Handle state transitions based on combo changes
    useEffect(() => {
        const currentFireType = combo >= 7 ? 'special' : 'basic';
        const previousFireType = previousCombo >= 7 ? 'special' : 'basic';

        if (combo >= 3 && previousCombo < 3) {
            // Starting fire
            setState('start');
            setCurrentFrame(0);
        } else if (combo >= 3 && previousCombo >= 3) {
            // Fire type changed (basic <-> special), restart animation
            if (currentFireType !== previousFireType) {
                setState('start');
                setCurrentFrame(0);
            } else if (state === 'start') {
                // Start animation finished, go to loop
                if (currentFrame >= startFrames.length - 1) {
                    setState('loop');
                    setCurrentFrame(0);
                }
            } else if (state === 'loop') {
                // Keep looping
                setState('loop');
            }
        } else if (combo < 3 && previousCombo >= 3) {
            // Combo ended, play end animation
            setState('end');
            setCurrentFrame(0);
        }
        setPreviousCombo(combo);
    }, [combo, previousCombo, state, currentFrame, startFrames.length]);

    // Animate frames based on state
    useEffect(() => {
        if (state === 'hidden' as FireState) return;

        let frames: string[];
        let fps: number;

        switch (state) {
            case 'start':
                frames = startFrames;
                fps = 10;
                break;
            case 'loop':
                frames = loopFrames;
                fps = 12;
                break;
            case 'end':
                frames = endFrames;
                fps = 10;
                break;
            default:
                return;
        }

        const frameInterval = 1000 / fps;
        const interval = setInterval(() => {
            setCurrentFrame((prev) => {
                const next = prev + 1;
                if (next >= frames.length) {
                    if (state === 'start') {
                        // Transition to loop
                        setState('loop');
                        return 0;
                    } else if (state === 'end') {
                        // End animation finished
                        setState('hidden');
                        onComplete?.();
                        return 0;
                    }
                    // Loop animation cycles
                    return 0;
                }
                return next;
            });
        }, frameInterval);

        return () => clearInterval(interval);
    }, [state, startFrames, loopFrames, endFrames, onComplete]);

    const getCurrentFrameImage = () => {
        switch (state) {
            case 'start':
                return startFrames[currentFrame] || startFrames[0] || '';
            case 'loop':
                return loopFrames[currentFrame] || loopFrames[0] || '';
            case 'end':
                return endFrames[currentFrame] || endFrames[0] || '';
            default:
                return '';
        }
    };

    if (state === 'hidden') return null;

    return (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: -10, bottom: '69%', width: '100%' }}>
            <img
                src={getCurrentFrameImage()}
                alt="Fire effect"
                className="block mx-auto"
                style={{
                    imageRendering: 'pixelated',
                    transform: 'scale(5)',
                }}
            />
        </div>
    );
};

export default Fire;


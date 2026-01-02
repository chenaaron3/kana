import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProjectileProps {
    onComplete: () => void;
    enemySpriteRef?: React.RefObject<HTMLElement | null>;
    playerContainerRef?: React.RefObject<HTMLElement | null>;
    type?: 'basic' | 'special'; // Type of projectile
}

// Import all projectile frame images using Vite's glob import
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

const basicProjectileFrames = sortFrames(
    import.meta.glob('~/assets/projectile/basic/*.png', { eager: true, import: 'default' })
);

const specialProjectileFrames = sortFrames(
    import.meta.glob('~/assets/projectile/special/*.png', { eager: true, import: 'default' })
);

// Configuration for projectile sizes
const PROJECTILE_SCALE: Record<'basic' | 'special', number> = {
    basic: 0.25,
    special: 3, // Special projectiles are much larger
};

const Projectile = ({ onComplete, enemySpriteRef, playerContainerRef, type = 'basic' }: ProjectileProps) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [startPosition, setStartPosition] = useState<{ x: number; y: number } | null>(null);
    const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);

    // Calculate start and target positions relative to player container
    // Use a small delay to ensure elements are fully rendered
    useEffect(() => {
        const calculatePositions = () => {
            if (enemySpriteRef?.current && playerContainerRef?.current) {
                const enemySpriteRect = enemySpriteRef.current.getBoundingClientRect();
                const playerContainerRect = playerContainerRef.current.getBoundingClientRect();

                // Calculate positions relative to player container
                // Origin at (0, 0) from the player
                const startX = 0;
                const startY = playerContainerRect.height / 2;

                // Target at (enemy.x - player.x, 0) - horizontal distance only
                const targetX = enemySpriteRect.left - playerContainerRect.left;
                const targetY = 0;

                setStartPosition({ x: startX, y: startY });
                setTargetPosition({ x: targetX, y: targetY });
            }
        };

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(calculatePositions, 50);
        return () => clearTimeout(timeoutId);
    }, [enemySpriteRef, playerContainerRef]);

    // Animate projectile frames
    useEffect(() => {
        const fps = 15; // Frames per second for projectile animation
        const frameInterval = 1000 / fps;

        const interval = setInterval(() => {
            setCurrentFrame((prev) => {
                const projectileFrames = type === 'special' ? specialProjectileFrames : basicProjectileFrames;
                const next = (prev + 1) % projectileFrames.length;
                return next;
            });
        }, frameInterval);

        return () => clearInterval(interval);
    }, [type]);

    const projectileFrames = type === 'special' ? specialProjectileFrames : basicProjectileFrames;
    const currentImage = projectileFrames[currentFrame] || projectileFrames[0] || '';

    if (!startPosition || !targetPosition) return null;

    return (
        <motion.div
            className="absolute"
            style={{
                zIndex: 1000,
                pointerEvents: 'none',
                left: 0,
                top: 0,
            }}
            initial={{
                x: startPosition.x,
                y: startPosition.y,
            }}
            animate={{
                x: targetPosition.x,
                y: targetPosition.y,
            }}
            transition={{
                duration: 0.5,
                ease: 'easeOut',
            }}
            onAnimationComplete={onComplete}
        >
            <img
                src={currentImage}
                alt="Projectile"
                style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    transform: `translate(-50%, -50%) scale(${PROJECTILE_SCALE[type]})`,
                }}
            />
        </motion.div>
    );
};

export default Projectile;


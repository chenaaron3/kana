import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProjectileProps {
    onComplete: () => void;
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

const projectileFrames = sortFrames(
    import.meta.glob('~/assets/projectile/basic/*.png', { eager: true, import: 'default' })
);

const Projectile = ({ onComplete }: ProjectileProps) => {
    const [currentFrame, setCurrentFrame] = useState(0);

    // Animate projectile frames
    useEffect(() => {
        const fps = 15; // Frames per second for projectile animation
        const frameInterval = 1000 / fps;

        const interval = setInterval(() => {
            setCurrentFrame((prev) => {
                const next = (prev + 1) % projectileFrames.length;
                return next;
            });
        }, frameInterval);

        return () => clearInterval(interval);
    }, []);

    const currentImage = projectileFrames[currentFrame] || projectileFrames[0] || '';

    return (
        <motion.div
            className="absolute"
            style={{
                zIndex: 10,
            }}
            initial={{
                left: '25%',
                top: '45%', // Start from wand position (higher up, where wand would be)
                x: '-50%',
                y: '-50%',
            }}
            animate={{
                left: '75%',
                top: '90%', // End at enemy center
                x: '-50%',
                y: '-50%',
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
                    transform: 'scale(0.25)', // 1/5 of player's scale(4) = 4/5 = 0.8
                }}
            />
        </motion.div>
    );
};

export default Projectile;


import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import backgroundImage from '~/assets/background.png';

export default function AnimatedBackground() {
    // Animate glow opacity and radius subtly together
    const glowOpacity = useMotionValue(0.5);
    const glowRadius = useMotionValue(60);

    useEffect(() => {
        const opacityControls = animate(glowOpacity, [0.5, 0.60, 0.5], {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
        });

        const radiusControls = animate(glowRadius, [45, 55, 45], {
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
        });

        return () => {
            opacityControls.stop();
            radiusControls.stop();
        };
    }, [glowOpacity, glowRadius]);

    const maskImage = useTransform(
        [glowOpacity, glowRadius],
        ([opacity, radius]) =>
            `radial-gradient(circle at 50% 30%, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,1) ${radius}%)`
    );

    return (
        <motion.div
            className="absolute inset-0 -z-50"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 1,
                zIndex: 0,
                maskImage: maskImage,
                WebkitMaskImage: maskImage,
            }}
            transition={{
                duration: 2,
                ease: 'easeInOut',
            }}
        />
    );
}


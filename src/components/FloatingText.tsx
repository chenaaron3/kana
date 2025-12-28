import { useEffect, useState } from 'react';
import { cn } from '~/lib/utils';

interface FloatingTextProps {
    text: string;
    x: number;
    y: number;
    color?: string;
    duration?: number;
    onComplete?: () => void;
}

export default function FloatingText({
    text,
    x,
    y,
    color = 'text-red-600',
    duration = 1500,
    onComplete,
}: FloatingTextProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                onComplete?.();
            }, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                'absolute pointer-events-none z-50 retro font-bold text-xl',
                color,
                'animate-float-up-fade'
            )}
            style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
                animationDuration: `${duration}ms`,
            }}
        >
            {text}
        </div>
    );
}


import emptyHeart from '~/assets/hearts/empty.png';
import fullHeart from '~/assets/hearts/full.png';

interface PlayerStatsProps {
    playerLives?: number;
    totalCorrect: number;
    totalAttempts: number;
    variant?: 'mobile' | 'desktop';
}

export default function PlayerStats({
    playerLives,
    totalCorrect,
    totalAttempts,
    variant = 'mobile',
}: PlayerStatsProps) {
    const isMobile = variant === 'mobile';
    const isDesktop = variant === 'desktop';

    return (
        <>
            {/* Player Lives Display */}
            {playerLives !== undefined && (
                <div
                    className={
                        isMobile
                            ? 'mt-1 flex gap-1'
                            : isDesktop
                                ? 'hidden md:flex absolute top-4 left-4 gap-1'
                                : ''
                    }
                >
                    {Array.from({ length: 3 }).map((_, i) => (
                        <img
                            key={i}
                            src={i < playerLives ? fullHeart : emptyHeart}
                            alt={i < playerLives ? 'Full heart' : 'Empty heart'}
                            className="w-6 h-6"
                            style={{
                                imageRendering: 'pixelated',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Accuracy Score */}
            {totalAttempts > 0 && (
                <div
                    className={
                        isMobile
                            ? 'retro text-sm text-muted-foreground'
                            : isDesktop
                                ? 'retro hidden md:block absolute top-4 right-4 text-sm text-muted-foreground'
                                : ''
                    }
                >
                    {totalCorrect} / {totalAttempts}
                </div>
            )}
        </>
    );
}


import emptyHeart from '~/assets/hearts/empty.png';
import fullHeart from '~/assets/hearts/full.png';

interface PlayerStatsProps {
    playerLives?: number;
    totalCorrect: number;
    totalAttempts: number;
}

export default function PlayerStats({
    playerLives,
    totalCorrect,
    totalAttempts,
}: PlayerStatsProps) {
    return (
        <>
            {/* Player Lives Display */}
            {playerLives !== undefined && (
                <div className="absolute top-1 left-2 flex flex-col md:flex-row gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <img
                            key={i}
                            src={i < playerLives ? fullHeart : emptyHeart}
                            alt={i < playerLives ? 'Full heart' : 'Empty heart'}
                            className="w-3 md:w-6 h-3 md:h-6"
                            style={{
                                imageRendering: 'pixelated',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Accuracy Score */}
            {totalAttempts > 0 && (
                <div className="hidden md:block absolute top-4 right-4 retro text-xs text-muted-foreground">
                    {totalCorrect} / {totalAttempts}
                </div>
            )}
        </>
    );
}


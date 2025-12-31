import { Button } from '~/components/ui/8bit/button';

import type { PreviousAnswer } from '~/types/progress';

interface QuizHeaderProps {
    previousAnswer: PreviousAnswer | null;
    onBack: () => void;
    headerRef: React.RefObject<HTMLDivElement | null>;
    isMobile: boolean;
}

export default function QuizHeader({
    previousAnswer,
    onBack,
    headerRef,
    isMobile,
}: QuizHeaderProps) {
    return (
        <div
            ref={headerRef}
            className={`${isMobile ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-10 ${previousAnswer
                    ? previousAnswer.isCorrect
                        ? "bg-green-600 border-green-600"
                        : "bg-red-600 border-red-600"
                    : "bg-amber-50 border-border shadow-sm"
                }`}
        >
            <div className="relative mx-auto max-w-4xl p-1 md:p-3 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                    {/* Back Button */}
                    <Button
                        onClick={onBack}
                        variant={previousAnswer ? "ghost" : "outline"}
                        className={previousAnswer ? "text-white hover:bg-white/20 border-white" : ""}
                    >
                        Exit
                    </Button>

                    {/* Previous Answer - Right aligned on mobile, centered on desktop */}
                    {previousAnswer && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-end md:left-1/2 md:-translate-x-1/2 md:items-center">
                            <div className="flex items-center gap-2 text-white">
                                <span className="text-base md:text-xl font-semibold">
                                    {previousAnswer.kana.map(k => k.character).join('')} = {previousAnswer.kana.map(k => k.romaji[0]).join('')}
                                </span>
                                {previousAnswer.isCorrect && (
                                    <span className="text-lg md:text-2xl">✓</span>
                                )}
                            </div>
                            {previousAnswer.isCorrect && previousAnswer.translation && (
                                <div className="text-xs md:text-sm text-white/80">
                                    Translation: {previousAnswer.translation}
                                </div>
                            )}
                            {!previousAnswer.isCorrect && (
                                <div className="text-xs md:text-sm text-white">
                                    You typed: <span className="font-mono font-semibold">{previousAnswer.userInput}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


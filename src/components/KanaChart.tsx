import { useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/8bit/card';
import { allKanaCharacters, allKanaGroups } from '~/data/kana';
import { calculateWeight, getRetrievability } from '~/utils/fsrs';

import type { KanaCharacter } from '~/data/kana';
import type { KanaCard } from '~/types/progress';

interface KanaChartProps {
    selectedGroups: Set<string>;
    kanaCards: Record<string, KanaCard> | null;
}

export default function KanaChart({ selectedGroups, kanaCards }: KanaChartProps) {
    const [selectedMetric, setSelectedMetric] = useState<
        | 'weight'
        | 'retrievability'
        | 'stability'
        | 'accuracy'
        | 'wilsonConfidence'
        | 'daysOverdue'
        | 'lapseRate'
        | 'learningProgress'
        | 'difficultyPriority'
        | 'difficulty'
    >('weight');

    // Get all selected kana IDs
    const getSelectedKanaIds = (): string[] => {
        const selectedKanaIds: string[] = [];
        allKanaGroups.forEach((group) => {
            const groupKey = `${group.name}-${group.characters[0]?.type ?? ''}`;
            if (selectedGroups.has(groupKey)) {
                group.characters.forEach((char) => {
                    selectedKanaIds.push(char.id);
                });
            }
        });
        return selectedKanaIds;
    };

    // Get kana character by ID
    const getKanaById = (kanaId: string): KanaCharacter | undefined => {
        return allKanaCharacters.find((kana) => kana.id === kanaId);
    };

    /**
     * Calculate Wilson Confidence Interval (lower bound)
     * This provides a conservative estimate of the true success rate,
     * accounting for sample size uncertainty.
     * 
     * @param successes - Number of successful attempts
     * @param total - Total number of attempts
     * @param z - Z-score for confidence level (default 1.96 for 95% confidence)
     * @returns Wilson confidence score (0-100 as percentage), or 0 if no attempts
     */
    const calculateWilsonConfidence = (
        successes: number,
        total: number,
        z: number = 1.96
    ): number => {
        if (total === 0) {
            return 0;
        }

        const p = successes / total;
        const n = total;

        // Wilson score interval formula (lower bound)
        const denominator = 1 + (z * z) / n;
        const numerator =
            p +
            (z * z) / (2 * n) -
            z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

        const wilsonLower = numerator / denominator;

        // Clamp to [0, 1] and return as percentage (0-100)
        return Math.max(0, Math.min(1, wilsonLower)) * 100;
    };

    // Calculate metric value for a kana
    const calculateMetric = (
        kanaId: string,
        metric:
            | 'weight'
            | 'retrievability'
            | 'stability'
            | 'accuracy'
            | 'wilsonConfidence'
            | 'daysOverdue'
            | 'lapseRate'
            | 'learningProgress'
            | 'difficultyPriority'
            | 'difficulty'
    ): number => {
        const kanaCard = kanaCards?.[kanaId] ?? null;
        const now = new Date();

        switch (metric) {
            case 'weight':
                return calculateWeight(kanaCard, now);
            case 'retrievability':
                return getRetrievability(kanaCard, now);
            case 'stability': {
                if (!kanaCard) return 0;
                return Math.round(kanaCard.card.stability * 100) / 100;
            }
            case 'accuracy': {
                if (!kanaCard) return 0;
                const totalShown = kanaCard.totalShown ?? 0;
                const totalCorrect = kanaCard.totalCorrect ?? 0;
                return totalShown > 0 ? Math.round((totalCorrect / totalShown) * 100) : 0;
            }
            case 'wilsonConfidence': {
                if (!kanaCard) return 0;
                const totalShown = kanaCard.totalShown ?? 0;
                const totalCorrect = kanaCard.totalCorrect ?? 0;
                return Math.round(calculateWilsonConfidence(totalCorrect, totalShown) * 100) / 100;
            }
            case 'daysOverdue': {
                if (!kanaCard) return 0;
                const card = kanaCard.card;
                const dueTime = card.due
                    ? (card.due instanceof Date
                        ? card.due.getTime()
                        : typeof card.due === 'string'
                            ? new Date(card.due).getTime()
                            : card.due)
                    : null;
                const daysUntilDue = dueTime
                    ? Math.ceil((dueTime - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0;
                // Return positive number for overdue cards, 0 for not overdue
                return daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
            }
            case 'lapseRate': {
                if (!kanaCard) return 0;
                const card = kanaCard.card;
                if (card.reps === 0) return 0;
                return Math.round((card.lapses / card.reps) * 100 * 100) / 100;
            }
            case 'learningProgress': {
                if (!kanaCard) return 0;
                const card = kanaCard.card;
                // Learning state = 1, total learning steps = 5 (from config: ["1m", "5m", "15m", "1h", "4h"])
                const totalLearningSteps = 5;
                if (card.state === 1) {
                    // Learning state: calculate progress through learning steps
                    const progress = ((totalLearningSteps - card.learning_steps) / totalLearningSteps) * 100;
                    return Math.round(progress * 100) / 100;
                }
                // Not in learning state = 100% progress
                return 100;
            }
            case 'difficultyPriority': {
                if (!kanaCard) return 0;
                const card = kanaCard.card;
                const lapseRate = card.reps > 0 ? (card.lapses / card.reps) * 100 : 0;
                // Combine difficulty with lapse rate for priority score
                const priority = card.difficulty * (1 + lapseRate / 100);
                return Math.round(priority * 100) / 100;
            }
            case 'difficulty': {
                if (!kanaCard) return 0;
                return Math.round(kanaCard.card.difficulty * 100) / 100;
            }
            default:
                return 0;
        }
    };

    const selectedKanaIds = getSelectedKanaIds();

    if (selectedKanaIds.length === 0) {
        return (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Kana Metrics Chart</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-96 items-center justify-center text-muted-foreground">
                        Select at least one kana group to view the chart
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Get all stats for a kana (similar to getKanaStats in KanaSelection)
    const getKanaStats = (kanaId: string) => {
        if (!kanaCards) return null;
        const kanaCard: KanaCard | undefined = kanaCards[kanaId];
        if (!kanaCard) return null;

        const card = kanaCard.card;
        const totalShown = kanaCard.totalShown ?? 0;
        const totalCorrect = kanaCard.totalCorrect ?? 0;
        const accuracy = totalShown > 0 ? Math.round((totalCorrect / totalShown) * 100) : 0;

        // Calculate days since last review
        let lastReviewTime: number | null = null;
        if (kanaCard.lastReview) {
            lastReviewTime = kanaCard.lastReview;
        } else if (card.last_review) {
            if (card.last_review instanceof Date) {
                lastReviewTime = card.last_review.getTime();
            } else if (typeof card.last_review === 'string') {
                lastReviewTime = new Date(card.last_review).getTime();
            } else if (typeof card.last_review === 'number') {
                lastReviewTime = card.last_review;
            }
        }
        const daysSinceLastReview = lastReviewTime
            ? Math.floor((Date.now() - lastReviewTime) / (1000 * 60 * 60 * 24))
            : null;

        // Calculate days until due
        const dueTime = card.due
            ? (card.due instanceof Date
                ? card.due.getTime()
                : typeof card.due === 'string'
                    ? new Date(card.due).getTime()
                    : card.due)
            : null;
        const daysUntilDue = dueTime
            ? Math.ceil((dueTime - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

        // Get state name
        const stateNames = ['New', 'Learning', 'Review', 'Relearning'];
        const stateName = stateNames[card.state] ?? 'Unknown';

        const now = new Date();
        const weight = calculateWeight(kanaCard, now);
        const retrievability = getRetrievability(kanaCard, now);
        const wilsonConfidence = calculateWilsonConfidence(totalCorrect, totalShown);

        // Calculate new metrics
        const daysOverdue = daysUntilDue !== null && daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
        const lapseRate = card.reps > 0 ? (card.lapses / card.reps) * 100 : 0;
        const totalLearningSteps = 5; // From config: ["1m", "5m", "15m", "1h", "4h"]
        const learningProgress = card.state === 1
            ? ((totalLearningSteps - card.learning_steps) / totalLearningSteps) * 100
            : 100;
        const difficultyPriority = card.difficulty * (1 + lapseRate / 100);

        return {
            // Our tracked stats
            reps: totalShown,
            correct: totalCorrect,
            accuracy,
            // FSRS card data
            fsrsReps: card.reps,
            fsrsLapses: card.lapses,
            stability: Math.round(card.stability * 10) / 10,
            difficulty: Math.round(card.difficulty * 10) / 10,
            state: stateName,
            scheduledDays: Math.round(card.scheduled_days * 10) / 10,
            learningSteps: card.learning_steps,
            // Timing info
            daysSinceLastReview,
            daysUntilDue,
            // Calculated metrics
            weight: Math.round(weight * 100) / 100,
            retrievability: Math.round(retrievability * 100) / 100,
            wilsonConfidence: Math.round(wilsonConfidence * 100) / 100,
            daysOverdue: Math.round(daysOverdue * 100) / 100,
            lapseRate: Math.round(lapseRate * 100) / 100,
            learningProgress: Math.round(learningProgress * 100) / 100,
            difficultyPriority: Math.round(difficultyPriority * 100) / 100,
        };
    };

    // Prepare chart data
    const chartData = selectedKanaIds
        .map((kanaId) => {
            const kana = getKanaById(kanaId);
            const value = calculateMetric(kanaId, selectedMetric);
            const stats = getKanaStats(kanaId);
            return {
                kanaId,
                character: kana?.character ?? kanaId,
                value: Math.round(value * 100) / 100, // Round to 2 decimal places
                stats, // Include all stats for tooltip
            };
        })
        .sort((a, b) => b.value - a.value); // Sort from high to low

    const metricLabels = {
        weight: 'Weight',
        retrievability: 'Retrievability',
        stability: 'Stability',
        accuracy: 'Accuracy (%)',
        wilsonConfidence: 'Wilson Confidence (%)',
        daysOverdue: 'Days Overdue',
        lapseRate: 'Lapse Rate (%)',
        learningProgress: 'Learning Progress (%)',
        difficultyPriority: 'Difficulty Priority',
        difficulty: 'Difficulty',
    };

    return (
        <Card className="mt-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Kana Metrics Chart</CardTitle>
                    <select
                        value={selectedMetric}
                        onChange={(e) =>
                            setSelectedMetric(e.target.value as typeof selectedMetric)
                        }
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <option value="weight">Weight</option>
                        <option value="retrievability">Retrievability</option>
                        <option value="stability">Stability</option>
                        <option value="accuracy">Accuracy</option>
                        <option value="wilsonConfidence">Wilson Confidence</option>
                        <option value="daysOverdue">Days Overdue</option>
                        <option value="lapseRate">Lapse Rate</option>
                        <option value="learningProgress">Learning Progress</option>
                        <option value="difficulty">Difficulty</option>
                        <option value="difficultyPriority">Difficulty Priority</option>
                    </select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="character"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                            />
                            <YAxis
                                label={{
                                    value: metricLabels[selectedMetric],
                                    angle: -90,
                                    position: 'insideLeft',
                                }}
                            />
                            <RechartsTooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload || payload.length === 0) {
                                        return null;
                                    }

                                    const data = payload[0]?.payload as {
                                        kanaId: string;
                                        character: string;
                                        value: number;
                                        stats: ReturnType<typeof getKanaStats> | null;
                                    };

                                    if (!data) return null;

                                    const stats = data.stats;
                                    const kana = getKanaById(data.kanaId);

                                    return (
                                        <div className="rounded-md border border-gray-700 bg-gray-900 p-3 text-sm text-white shadow-lg">
                                            <div className="mb-2 font-semibold border-b border-gray-700 pb-1">
                                                {kana?.character ?? data.character} ({kana?.romaji[0] ?? ''})
                                            </div>
                                            {stats ? (
                                                <div className="space-y-1.5 text-xs">
                                                    <div className="font-semibold text-sm mb-2">
                                                        {metricLabels[selectedMetric]}: {data.value}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div>Shown: <span className="font-semibold">{stats.reps}</span> times</div>
                                                        <div>Correct: <span className="font-semibold">{stats.correct}</span> times</div>
                                                        <div>Accuracy: <span className="font-semibold">{stats.accuracy}%</span></div>
                                                        <div>Wilson Confidence: <span className="font-semibold">{stats.wilsonConfidence}%</span></div>
                                                    </div>
                                                    <div className="border-t border-gray-700 pt-1 space-y-0.5">
                                                        <div>State: <span className="font-semibold">{stats.state}</span></div>
                                                        <div>Stability: <span className="font-semibold">{stats.stability}</span></div>
                                                        <div>Difficulty: <span className="font-semibold">{stats.difficulty}</span></div>
                                                        <div>Weight: <span className="font-semibold">{stats.weight}</span></div>
                                                        <div>Retrievability: <span className="font-semibold">{stats.retrievability}</span></div>
                                                        <div>Days Overdue: <span className="font-semibold">{stats.daysOverdue}</span></div>
                                                        <div>Lapse Rate: <span className="font-semibold">{stats.lapseRate}%</span></div>
                                                        <div>Learning Progress: <span className="font-semibold">{stats.learningProgress}%</span></div>
                                                        <div>Difficulty Priority: <span className="font-semibold">{stats.difficultyPriority}</span></div>
                                                        <div>FSRS Reps: <span className="font-semibold">{stats.fsrsReps}</span></div>
                                                        <div>FSRS Lapses: <span className="font-semibold">{stats.fsrsLapses}</span></div>
                                                        <div>Scheduled Days: <span className="font-semibold">{stats.scheduledDays}</span></div>
                                                        {stats.daysSinceLastReview !== null && (
                                                            <div>Last review: <span className="font-semibold">{stats.daysSinceLastReview}d ago</span></div>
                                                        )}
                                                        {stats.daysUntilDue !== null && stats.daysUntilDue > 0 && (
                                                            <div>Due in: <span className="font-semibold">{stats.daysUntilDue}d</span></div>
                                                        )}
                                                        {stats.daysUntilDue !== null && stats.daysUntilDue <= 0 && (
                                                            <div className="text-yellow-400">Due now</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-300">
                                                    New - Not yet reviewed
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}


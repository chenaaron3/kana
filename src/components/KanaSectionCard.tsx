import { Button } from '~/components/ui/8bit/button';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '~/components/ui/8bit/card';
import { Checkbox } from '~/components/ui/8bit/checkbox';
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger
} from '~/components/ui/8bit/collapsible';
import { Kbd } from '~/components/ui/8bit/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

import type { KanaGroup } from '~/data/kana';
import type { KanaCard } from '~/types/progress';

interface KanaSectionCardProps {
    title: string;
    groups: KanaGroup[];
    selectedGroups: Set<string>;
    kanaCards: Record<string, KanaCard> | null;
    onCheckAll: () => void;
    onClear: () => void;
    onToggleGroup: (groupKey: string) => void;
    getAccuracyColor: (kanaId: string) => string;
    renderKanaTooltip: (kanaId: string) => React.ReactNode;
}

export default function KanaSectionCard({
    title,
    groups,
    selectedGroups,
    onCheckAll,
    onClear,
    onToggleGroup,
    getAccuracyColor,
    renderKanaTooltip,
}: KanaSectionCardProps) {
    // Count total selected kana characters
    const selectedKanaCount = groups.reduce((count, group) => {
        const groupKey = `${group.name}-${group.characters[0]?.type ?? ""}`;
        if (selectedGroups.has(groupKey)) {
            return count + group.characters.length;
        }
        return count;
    }, 0);

    const renderKanaGrid = () => {
        return (
            <div className="flex flex-col md:flex-row gap-1 md:overflow-x-auto pb-4">
                {groups.map((group) => {
                    const groupKey = `${group.name}-${group.characters[0]?.type ?? ""}`;
                    const isSelected = selectedGroups.has(groupKey);
                    return (
                        <div key={groupKey} className="flex flex-row md:flex-col md:min-w-[70px] gap-3 md:gap-0">
                            {/* Checkbox on left (mobile) or top (desktop) */}
                            <div className="flex items-center md:justify-center md:mb-1 scale-75 md:scale-100">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => onToggleGroup(groupKey)}
                                />
                            </div>
                            {/* Characters in row (mobile) or column (desktop) */}
                            <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                                {group.characters.map((char) => {
                                    const color = getAccuracyColor(char.id);
                                    return (
                                        <Tooltip key={char.id}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`flex min-h-[32px] md:min-h-[40px] flex-col items-center justify-center rounded-md border-2 transition-all cursor-help ${isSelected ? "border-primary" : "border-border"} ${color} p-1 shrink-0`}
                                                >
                                                    <Kbd className="text-base md:text-lg font-bold px-2 py-1">
                                                        {char.character}
                                                    </Kbd>
                                                    <div className="text-[10px] md:text-xs text-muted-foreground">{char.romaji[0]}</div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="border-gray-700 max-w-xs">
                                                {renderKanaTooltip(char.id)}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <Card>
            <Collapsible defaultOpen>
                <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0">
                        <CollapsibleTrigger className="flex flex-col items-start gap-1 text-left w-auto">
                            <CardTitle className="text-lg md:text-2xl text-center md:text-left w-full">{title}</CardTitle>
                            <CardDescription className="text-xs md:text-sm w-full text-center md:text-left">
                                {selectedKanaCount} kana selected
                            </CardDescription>
                        </CollapsibleTrigger>
                        <div className="flex flex-row gap-2 justify-evenly" onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs md:text-sm"
                                onClick={onCheckAll}
                            >
                                Check all
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs md:text-sm"
                                onClick={onClear}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        {renderKanaGrid()}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}


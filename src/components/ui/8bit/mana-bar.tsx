import { Progress } from '~/components/ui/8bit/progress';

interface ManaBarProps extends React.ComponentProps<"div"> {
    className?: string;
    variant?: "retro" | "default";
    value?: number;
}

export default function ManaBar({
    className,
    variant = "retro",
    value,
    ...props
}: ManaBarProps) {
    return (
        <Progress
            {...props}
            value={value}
            variant={variant}
            className={className}
            progressBg="bg-blue-500"
        />
    );
}


import { Progress } from '~/components/ui/8bit/progress';

interface HealthBarProps extends React.ComponentProps<"div"> {
  className?: string;
  variant?: "retro" | "default";
  value?: number;
}

export default function HealthBar({
  className,
  variant = "retro",
  value,
  ...props
}: HealthBarProps) {
  return (
    <Progress
      {...props}
      value={value}
      variant={variant}
      className={className}
      progressBg="bg-red-500"
    />
  );
}

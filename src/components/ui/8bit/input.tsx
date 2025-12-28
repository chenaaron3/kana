import { forwardRef } from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/lib/utils";

import { Input as ShadcnInput } from "~/components/ui/input";

import "./styles/retro.css";

export const inputVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

export interface BitInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean;
}

const Input = forwardRef<HTMLInputElement, BitInputProps>(({ className, font, ...props }, ref) => {
  return (
    <div
      className={cn(
        "relative border-y-6 border-foreground dark:border-ring !p-0 flex items-center",
        className
      )}
    >
      <ShadcnInput
        ref={ref}
        {...props}
        className={cn(
          "rounded-none ring-0 !w-full",
          font !== "normal" && "retro"
        )}
      />

      <div
        className="absolute inset-0 border-x-6 -mx-1.5 border-foreground dark:border-ring pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
});

Input.displayName = "Input";

export { Input };

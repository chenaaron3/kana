import './styles/retro.css';

import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { cn } from '~/lib/utils';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

import type { VariantProps } from 'class-variance-authority';

export const collapsibleVariants = cva("", {
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

export interface BitCollapsibleProps
    extends React.ComponentProps<typeof CollapsiblePrimitive.Root>,
    VariantProps<typeof collapsibleVariants> { }

const Collapsible = React.forwardRef<
    React.ElementRef<typeof CollapsiblePrimitive.Root>,
    BitCollapsibleProps
>(({ className, font, ...props }, ref) => (
    <CollapsiblePrimitive.Root
        ref={ref}
        className={cn(font !== "normal" && "retro", className)}
        {...props}
    />
));
Collapsible.displayName = CollapsiblePrimitive.Root.displayName;

const CollapsibleTrigger = React.forwardRef<
    React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> & {
        font?: "normal" | "retro";
    }
>(({ className, font = "retro", children, ...props }, ref) => (
    <CollapsiblePrimitive.Trigger
        ref={ref}
        className={cn(
            "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity",
            "[&[data-state=open]>svg]:rotate-180",
            font !== "normal" && "retro",
            className
        )}
        {...props}
    >
        {children}
        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
    </CollapsiblePrimitive.Trigger>
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.Trigger.displayName;

const CollapsibleContent = React.forwardRef<
    React.ElementRef<typeof CollapsiblePrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> & {
        font?: "normal" | "retro";
    }
>(({ className, font = "retro", ...props }, ref) => (
    <CollapsiblePrimitive.Content
        ref={ref}
        className={cn(
            "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
            font !== "normal" && "retro",
            className
        )}
        {...props}
    />
));
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };


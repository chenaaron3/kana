import './styles/retro.css';

import { cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '~/lib/utils';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

import type { VariantProps } from 'class-variance-authority';

const PixelArrow = ({ className }: { className?: string }) => (
    <svg
        fill="currentColor"
        viewBox="0 0 22 22"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M16 10H17V9H18V7H16V8H15V9H14V10H13V11H12V12H10V11H9V10H8V9H7V8H6V7H4V9H5V10H6V11H7V12H8V13H9V14H10V15H12V14H13V13H14V12H15V11H16" />
    </svg>
);

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
            "relative flex items-start cursor-pointer hover:opacity-80 transition-opacity",
            "[&[data-state=open]>svg:first-child]:rotate-180",
            font !== "normal" && "retro",
            className
        )}
        {...props}
    >
        <PixelArrow className="absolute left-0 top-0 h-6 w-6 transition-transform duration-200" />
        <div className="pl-0 md:pl-8 w-full">
            {children}
        </div>
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


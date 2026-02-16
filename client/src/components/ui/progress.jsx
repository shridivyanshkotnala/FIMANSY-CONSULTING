import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

/*
  Generic progress bar component.
  `value` = percentage (0 → 100)
  indicatorClassName lets you override the fill color per usage.
*/

export const Progress = React.forwardRef(function Progress(
  { className, value = 0, indicatorClassName, ...props },
  ref
) {
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 bg-primary transition-all",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});

Progress.displayName = "Progress";

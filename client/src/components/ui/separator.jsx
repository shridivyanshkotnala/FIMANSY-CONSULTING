import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

/*
  Visual divider line between sections.
  Can be horizontal (default) or vertical.
  Purely presentational unless decorative=false is passed.
*/

export const Separator = React.forwardRef(function Separator(
  { className, orientation = "horizontal", decorative = true, ...props },
  ref
) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
});

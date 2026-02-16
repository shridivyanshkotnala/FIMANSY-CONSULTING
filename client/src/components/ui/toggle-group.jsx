import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

/**
 * Shares styling (size + variant) between all items inside the group
 * so you don't have to repeat props on every ToggleGroupItem
 */
const ToggleGroupContext = React.createContext({
  size: "default",
  variant: "default",
});

/**
 * Wrapper around Radix ToggleGroup root
 * Controls layout + passes styling config to children
 */
const ToggleGroup = React.forwardRef(
  ({ className, variant, size, children, ...props }, ref) => (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
);

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

/**
 * Individual toggle button inside group
 * Automatically inherits size & variant from parent
 */
const ToggleGroupItem = React.forwardRef(
  ({ className, children, variant, size, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext);

    return (
      <ToggleGroupPrimitive.Item
        ref={ref}
        className={cn(
          toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          className
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Item>
    );
  }
);

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };

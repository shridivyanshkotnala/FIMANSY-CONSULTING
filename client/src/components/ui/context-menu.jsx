import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Context Menu (Right-Click Menu)

  Provides desktop-style contextual actions when user right clicks an element.

  Example usage:
  - document actions (rename, delete, move)
  - table row actions
  - file manager behaviour
  - advanced power-user shortcuts

  Pure UI infrastructure — attach business logic later.
*/

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export const ContextMenuContent = React.forwardRef(function ContextMenuContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});

export const ContextMenuItem = React.forwardRef(function ContextMenuItem({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});

export const ContextMenuCheckboxItem = React.forwardRef(function ContextMenuCheckboxItem(
  { className, children, checked, ...props },
  ref
) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      checked={checked}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});

export const ContextMenuRadioItem = React.forwardRef(function ContextMenuRadioItem(
  { className, children, ...props },
  ref
) {
  return (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});

export const ContextMenuLabel = React.forwardRef(function ContextMenuLabel({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className)}
      {...props}
    />
  );
});

export const ContextMenuSeparator = React.forwardRef(function ContextMenuSeparator({ className, ...props }, ref) {
  return <ContextMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
});

export const ContextMenuSubTrigger = React.forwardRef(function ContextMenuSubTrigger(
  { className, inset, children, ...props },
  ref
) {
  return (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
});

export const ContextMenuSubContent = React.forwardRef(function ContextMenuSubContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    />
  );
});

export function ContextMenuShortcut({ className, ...props }) {
  return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
}

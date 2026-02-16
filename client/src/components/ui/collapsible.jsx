import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/*
  Collapsible

  Simple wrapper around Radix Collapsible.
  Used for expandable sections (FAQ, filters, panels etc.)

  No logic — just re-exported so UI layer stays consistent
  and you can later replace Radix without refactoring the app.
*/

export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
export const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

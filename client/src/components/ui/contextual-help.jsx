import { HelpCircle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

/*
  ContextualHelp

  Small inline help tooltip icon used beside labels or headings.
  Shows explanatory text when user hovers or focuses.

  Purpose:
  Reduce confusion without cluttering UI with long descriptions.
  Very important for finance / compliance UI where terms are unfamiliar.

  Example:
  "Cash Gap (?)"
  "Compliance Health (?)"
*/

export function ContextualHelp({ content, className }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            "text-muted-foreground hover:text-foreground transition-colors focus:outline-none",
            className
          )}
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </HoverCardTrigger>

      <HoverCardContent className="w-64 text-sm bg-popover" side="top" align="end">
        <p>{content}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

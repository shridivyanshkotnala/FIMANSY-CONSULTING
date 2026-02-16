import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sticky mobile filter bar
 * Pure UI state only (open dropdown tracking)
 *
 * IMPORTANT:
 * The actual filter state is controlled by parent.
 * Parent will later connect this to Redux selectors.
 *
 * So DO NOT add API logic here ever.
 * This component must remain dumb/presentational.
 */

export function MobileStickyFilters({ filters, className }) {
  const [openFilter, setOpenFilter] = useState(null);

  return (
    <div className={cn("sticky top-14 z-30 bg-background border-b border-border", className)}>
      <div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === filter.key ? null : filter.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors touch-manipulation",
                filter.value !== "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {filter.label}
              {filter.value !== "all" && (
                <span className="text-xs opacity-75">
                  ({filter.options.find(o => o.value === filter.value)?.label})
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  openFilter === filter.key && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown */}
            {openFilter === filter.key && (
              <>
                {/* Backdrop close */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpenFilter(null)}
                />

                <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[160px] py-1 animate-fade-in">
                  {filter.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        // Parent state handler (Redux later)
                        filter.onChange(option.value);
                        setOpenFilter(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm text-left touch-manipulation",
                        filter.value === option.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {option.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

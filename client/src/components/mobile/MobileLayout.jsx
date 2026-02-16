import { MobileBottomNav } from "./MobileBottomNav";
import { MobileFAB } from "./MobileFAB";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * MobileLayout
 * --------------------------------------------------
 * Wrapper layout used across all mobile screens.
 * Responsible ONLY for UI framing — not business logic.
 *
 * Future Redux placement:
 * - Global UI state like header title, FAB visibility, nav visibility
 *   should eventually live in a uiSlice (not passed as props everywhere)
 * - This component will then read from Redux instead of props
 */
export function MobileLayout({
  children,
  title,
  showBack = false,
  actions,
  hideNav = false,
  hideFAB = false,
  className,
}) {
  const navigate = useNavigate();

  // Later Redux example:
  // const { title, showBack } = useSelector(state => state.ui.mobileHeader)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {showBack && (
              <button
                onClick={() => navigate(-1)} // Router navigation (keep local, do NOT move to Redux)
                className="p-2 -ml-2 rounded-full hover:bg-accent active:bg-accent/80 touch-manipulation"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <h1 className="text-lg font-semibold font-heading truncate">
              {title}
            </h1>
          </div>

          {/* Optional right-side actions (filters, upload, etc) */}
          {actions && (
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Content Area */}
      <main
        className={cn(
          "flex-1 overflow-auto",
          !hideNav && "pb-20", // prevents content hidden behind bottom nav
          className
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation (app level navigation) */}
      {!hideNav && <MobileBottomNav />}

      {/* Floating Action Button (contextual primary action) */}
      {!hideFAB && !hideNav && <MobileFAB />}
    </div>
  );
}

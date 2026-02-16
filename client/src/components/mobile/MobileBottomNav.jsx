import { useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, CreditCard, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom mobile navigation bar
 *
 * CURRENT:
 * Uses react-router location to detect active route
 *
 * FUTURE REDUX:
 * You may optionally store current module in UI slice
 * (ui.activeModule) for global highlighting across layouts
 * But routing should still remain source of truth.
 */

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/documents", icon: FileText, label: "Documents" },
  { path: "/banking", icon: CreditCard, label: "Banking" },
  { path: "/cash-intelligence", icon: BarChart3, label: "Cash Flow" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determines active tab based on current route
  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[56px] py-1 transition-colors touch-manipulation",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground active:text-primary"
              )}
            >
              <item.icon
                className={cn(
                  "h-6 w-6 mb-1 transition-transform",
                  active && "scale-110"
                )}
              />

              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  active && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

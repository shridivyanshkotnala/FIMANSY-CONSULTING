import { useLocation, useNavigate } from "react-router-dom";
import { Upload, BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  PillarBottomNav

  Mobile navigation bar (bottom tabs).
  Mirrors the sidebar navigation for small screens.

  Pure navigation component
  No global state
  No backend dependency
*/

const pillars = [
  { id: "upload", title: "Upload", icon: Upload, path: "/documents" },
  { id: "command", title: "Command", icon: Zap, path: "/" },
  { id: "reports", title: "Reports", icon: BarChart3, path: "/reports" },
];

export function PillarBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handlePillarClick = (pillar) => navigate(pillar.path);

  const isActive = (pillar) => {
    if (pillar.path === "/") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname.startsWith(pillar.path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {pillars.map((pillar) => (
          <button
            key={pillar.id}
            onClick={() => handlePillarClick(pillar)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              pillar.id === "command"
                ? isActive(pillar)
                  ? "text-primary"
                  : "text-muted-foreground"
                : "text-primary"
            )}
          >
            <pillar.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{pillar.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ListChecks,
  Landmark,
  MessageSquare,
  LogOut,
  ChevronLeft,
  Bell,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogoutMutation } from "@/Redux/Slices/api/authApi";
import { useToast } from "@/hooks/use-toast";

/*
  Removed:
  interface AccountantLayoutProps {
    children: ReactNode;
  }
*/

const NAV_ITEMS = [
  { path: "/accountant/dashboard", label: "Compliance", icon: ListChecks },
  { path: "/accountant/reconciliation", label: "Bank Recon", icon: Landmark },
  { path: "/accountant/queries", label: "Query Hub", icon: MessageSquare },
];

/*
  Removed:
  ({ children }: AccountantLayoutProps)
  → now plain destructuring
*/
export function AccountantLayout({ children }) {

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();

  const handleExitPortal = async () => {
    try {
      await logout().unwrap();
      navigate("/accountant-login", { replace: true });
    } catch {
      toast({
        title: "Logout failed",
        description: "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar-background transition-all duration-200",
          sidebarOpen ? "w-56" : "w-16"
        )}
      >

        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>

          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                Accountant
              </p>
              <p className="text-[10px] text-muted-foreground">
                Professional Portal
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {

            const isActive =
              location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />

                {sidebarOpen && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}

              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-1">

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                !sidebarOpen && "rotate-180"
              )}
            />

            {sidebarOpen && <span>Collapse</span>}
          </button>

          <button
            onClick={handleExitPortal}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span>{loggingOut ? "Logging out…" : "Exit Portal"}</span>}
          </button>

        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50">

          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div />

          <div className="flex items-center gap-2">

            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-4 w-4" />

              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive text-[8px] text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>

            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              A
            </div>

          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

      </main>
    </div>
  );
}
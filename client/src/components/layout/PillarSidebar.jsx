import { useLocation, useNavigate } from "react-router-dom";
import { Upload, BarChart3, Zap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMeQuery, useLogoutMutation } from "@/Redux/Slices/api/authApi";
import zohoLogo from "@/assets/zohoLogo.jpeg";
import { useGetZohoStatusQuery } from "@/Redux/Slices/api/zohoApi";
//   PillarSidebar

//   Main desktop navigation rail.

//   Shows:
//   - navigation pillars (Upload / Command / Reports)
//   - user avatar
//   - sign out button

//   CONTEXT DEPENDENCY:
//   Currently reads auth state via useAuth()
//   Later replace with Redux selector: state.auth.profile
// */

const pillars = [
  { id: "upload", title: "Upload", icon: Upload, path: "/documents", description: "Upload Documents" },
  { id: "command", title: "Command", icon: Zap, path: "/", description: "Control Centre" },
  { id: "reports", title: "Reports", icon: BarChart3, path: "/reports", description: "Insights & Output" },
];

export function PillarSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // SERVER AUTH STATE (single source of truth)
  const { data: user } = useMeQuery();
  const [logout] = useLogoutMutation();

  const handlePillarClick = (pillar) => navigate(pillar.path);

  const isActive = (pillar) => {
    if (pillar.path === "/") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname.startsWith(pillar.path);
  };


  const handleSignOut = async () => {
    try {
      await logout().unwrap(); // clears cookies + RTK cache
    } catch { }
    navigate("/auth", { replace: true });
  };


  const { data: zoho, isLoading } = useGetZohoStatusQuery();

  const zohoConnectionHandler = () => {
    if (!zoho?.connected) {
      const activeOrg = localStorage.getItem("activeOrgId");
      const url = activeOrg ? `/api/zoho/connect?org=${activeOrg}` : "/api/zoho/connect";
      window.location.href = url;// url = /api/zoho/connect
    }
  };


  return (
    <aside className="hidden md:flex flex-col w-20 bg-sidebar-background border-r border-sidebar-border h-screen fixed left-0 top-0 z-40">

      {/* Logo */}
      <div className="p-4 flex justify-center border-b border-sidebar-border">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-lg font-bold text-primary-foreground font-serif">F</span>
        </div>
      </div>

      {/* Navigation Pillars */}
      <nav className="flex-1 flex flex-col items-center gap-2 py-6">
        {pillars.map((pillar) => (
          <Tooltip key={pillar.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handlePillarClick(pillar)}
                className={cn(
                  "w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200",
                  "hover:scale-105",
                  pillar.id === "command"
                    ? isActive(pillar)
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    : "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                )}
              >
                <pillar.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{pillar.title}</span>
              </button>
            </TooltipTrigger>

            <TooltipContent side="right" className="bg-popover border-border">
              <p className="font-medium">{pillar.title}</p>
              <p className="text-xs text-muted-foreground">{pillar.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}{/* Zoho Connection Button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={zohoConnectionHandler}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 mt-2
        ${zoho?.connected
                  ? "bg-green-100 shadow-inner"
                  : "bg-white shadow-lg hover:shadow-xl"
                }
      `}
            >
              <img
                src={zohoLogo}
                alt="Zoho Books"
                className={`w-10 h-10 rounded-full transition-all ${zoho?.connected ? "opacity-100" : "opacity-70"
                  }`}
              />
            </button>
          </TooltipTrigger>

          <TooltipContent side="right" className="bg-popover border-border">
            <p className="font-medium">Zoho Books</p>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Checking connection..."
                : zoho?.connected
                  ? "Connected ✓"
                  : "Not connected — Click to connect"}
            </p>
          </TooltipContent>
        </Tooltip>

      </nav>

      {/* Footer (user + logout) */}
      <div className="p-4 border-t border-sidebar-border flex flex-col items-center gap-2">

        {user?.email && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground text-xs font-medium">
                {user.email.charAt(0).toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border-border">
              {user.email}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">
            Sign Out
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

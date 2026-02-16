// AppSidebar.jsx
// Converted TSX → JSX
// Complex navigation sidebar with grouped navigation and auth footer

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  FileText, 
  Upload, 
  CreditCard, 
  TrendingUp,
  Package,
  FileBarChart,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
  Zap,
  CircleDot,
  Shield
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/*
REDUX MIGRATION NOTE
--------------------
useSidebar() -> layout UI state (collapsed/expanded)
Should become uiLayoutSlice.sidebarState

useAuth() -> authentication & profile
Should become authSlice with:
 - user
 - email
 - logout action (async thunk)
*/

// Navigation groups (business structure — DO NOT API-DRIVE THESE)
const activeItems = [
  { title: "Command Center", url: "/", icon: Zap, description: "The Pulse" },
  { title: "Cash Flow", url: "/cash-intelligence", icon: TrendingUp, description: "Money In/Out" },
  { title: "Invoices", url: "/documents", icon: FileText, description: "Sales & Billing" },
];

const operationalItems = [
  { title: "Banking", url: "/banking", icon: CreditCard, description: "Reconciliation" },
  { title: "Inventory", url: "/inventory", icon: Package, description: "Stock & Reorder" },
  { title: "Compliance", url: "/compliance", icon: Shield, description: "MCA & Tax" },
  { title: "Upload Documents", url: "/upload", icon: Upload, description: "Bills & Statements" },
];

const reviewItems = [
  { title: "Reports", url: "/reports", icon: FileBarChart, description: "Analytics" },
  { title: "Team", url: "/team", icon: Users, description: "Access Control" },
  { title: "Settings", url: "/settings", icon: Settings, description: "Preferences" },
];

function NavGroup({ label, items, indicatorColor, collapsed, currentPath, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isGroupActive = items.some(item => 
    item.url === "/" ? currentPath === "/" : currentPath.startsWith(item.url)
  );

  const isActive = (path) => {
    if (path === "/") return currentPath === "/" || currentPath === "/dashboard";
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  return (
    <SidebarGroup>
      <Collapsible open={isOpen || isGroupActive} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:text-sidebar-foreground transition-colors flex items-center justify-between w-full pr-2 group">
            {!collapsed && (
              <>
                <div className="flex items-center gap-2">
                  <CircleDot className={cn("h-2.5 w-2.5", indicatorColor)} />
                  <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
                </div>
                {isOpen || isGroupActive ? (
                  <ChevronDown className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                )}
              </>
            )}
            {collapsed && <CircleDot className={cn("h-3 w-3 mx-auto", indicatorColor)} />}
          </SidebarGroupLabel>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={`${item.title} - ${item.description}`}>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  // CONTEXT → REDUX LATER
  const { state } = useSidebar();

  const location = useLocation();
  const navigate = useNavigate();

  // AUTH CONTEXT → REDUX authSlice later
  const { signOut, profile } = useAuth();
  
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const handleSignOut = async () => {
    // FUTURE: dispatch(logoutUser())
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sm font-bold text-sidebar-primary-foreground font-serif">F</span>
            </div>
            {!collapsed && (
              <span className="font-serif font-bold text-lg text-sidebar-foreground">Fimansy</span>
            )}
          </div>
        </div>

        <NavGroup label="Active" items={activeItems} indicatorColor="text-success" collapsed={collapsed} currentPath={currentPath} defaultOpen={true} />
        <Separator className="bg-sidebar-border mx-2" />

        <NavGroup label="Operational" items={operationalItems} indicatorColor="text-warning" collapsed={collapsed} currentPath={currentPath} defaultOpen={false} />
        <Separator className="bg-sidebar-border mx-2" />

        <NavGroup label="Review" items={reviewItems} indicatorColor="text-info" collapsed={collapsed} currentPath={currentPath} defaultOpen={false} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          {!collapsed && profile?.email && (
            <p className="text-xs text-sidebar-foreground/60 truncate mb-2 px-2">{profile.email}</p>
          )}

          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

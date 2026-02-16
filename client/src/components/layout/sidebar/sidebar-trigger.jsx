import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-provider";

export function SidebarTrigger(props) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} {...props}>
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";

const SIDEBAR_WIDTH_MOBILE = "18rem";

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div className={cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar", className)}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          className="w-[--sidebar-width] bg-sidebar p-0"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
        >
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-state={state}
      data-side={side}
      data-variant={variant}
      className={cn("hidden md:block", className)}
      {...props}
    >
      <div className="fixed inset-y-0 w-[--sidebar-width] bg-sidebar">
        {children}
      </div>
    </div>
  );
}

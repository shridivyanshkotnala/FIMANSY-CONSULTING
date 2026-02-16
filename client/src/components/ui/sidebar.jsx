// sidebar.jsx
// UI barrel file — re-exports all sidebar primitives
// AppLayout and AppSidebar import from "@/components/ui/sidebar"
// Actual implementations live in @/components/layout/sidebar/*

import React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Re-exports from layout/sidebar ──────────────────────────
export { SidebarProvider, useSidebar } from "@/components/layout/sidebar/sidebar-provider";
export { Sidebar } from "@/components/layout/sidebar/sidebar";
export { SidebarTrigger } from "@/components/layout/sidebar/sidebar-trigger";

// ── SidebarInset ────────────────────────────────────────────
export function SidebarInset({ className, ...props }) {
  return (
    <main
      className={cn(
        "relative flex min-h-svh flex-1 flex-col bg-background",
        "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))]",
        className
      )}
      {...props}
    />
  );
}

// ── SidebarContent ──────────────────────────────────────────
export function SidebarContent({ className, ...props }) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto", className)}
      {...props}
    />
  );
}

// ── SidebarGroup ────────────────────────────────────────────
export function SidebarGroup({ className, ...props }) {
  return (
    <div
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

// ── SidebarGroupLabel ───────────────────────────────────────
export function SidebarGroupLabel({ className, asChild, ...props }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none transition-[margin,opacity] duration-200",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

// ── SidebarGroupContent ─────────────────────────────────────
export function SidebarGroupContent({ className, ...props }) {
  return <div className={cn("w-full text-sm", className)} {...props} />;
}

// ── SidebarMenu ─────────────────────────────────────────────
export function SidebarMenu({ className, ...props }) {
  return (
    <ul
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

// ── SidebarMenuItem ─────────────────────────────────────────
export function SidebarMenuItem({ className, ...props }) {
  return (
    <li
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

// ── SidebarMenuButton ───────────────────────────────────────
export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  const button = (
    <Comp
      data-active={isActive}
      className={cn(
        "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding]",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "active:bg-sidebar-accent active:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
        "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  );

  if (!tooltip) return button;

  const tooltipLabel = typeof tooltip === "string" ? tooltip : tooltip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>@/components/payroll/SalaryStructureEditor
→
@/payroll/SalaryStructureEditor

      <TooltipContent side="right" align="center" className="z-50">
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
  );
}

// ── SidebarFooter ───────────────────────────────────────────
export function SidebarFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

// ── SidebarHeader ───────────────────────────────────────────
export function SidebarHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

// ── SidebarSeparator ────────────────────────────────────────
export function SidebarSeparator({ className, ...props }) {
  return (
    <hr
      className={cn("mx-2 w-auto border-sidebar-border", className)}
      {...props}
    />
  );
}

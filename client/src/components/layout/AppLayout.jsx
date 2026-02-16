// AppLayout.jsx
// Converted from TSX → JSX
// Purpose: Global application shell (sidebar + header + content area)

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb";

/*
CONTEXT API WARNING
-------------------
SidebarProvider internally uses React Context to control sidebar open/close state.
When migrating to Redux, this should become something like:
uiLayoutSlice:
 - isSidebarOpen
 - toggleSidebar()
 - closeSidebar()

For now DO NOT delete provider — other components depend on it.
Later replace SidebarProvider logic with Redux-backed provider wrapper.
*/

/*
PROPS DOCUMENTATION (from removed TypeScript interface)
-------------------------------------------------------
children     : page content
title        : page title shown in header breadcrumb
description  : optional subtitle text under header
actions      : optional right-side header actions (buttons etc)
*/

export function AppLayout({ children, title, description, actions }) {
  return (
    <SidebarProvider>
      {/* Navigation sidebar */}
      <AppSidebar />

      <SidebarInset>
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-card px-4">
          {/* Sidebar toggle button */}
          {/* FUTURE REDUX ACTION: dispatch(toggleSidebar()) */}
          <SidebarTrigger className="-ml-1" />

          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Page breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header action buttons (optional) */}
          {actions && (
            <div className="ml-auto flex items-center gap-2">
              {actions}
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {description && (
            <p className="mb-6 text-muted-foreground">{description}</p>
          )}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

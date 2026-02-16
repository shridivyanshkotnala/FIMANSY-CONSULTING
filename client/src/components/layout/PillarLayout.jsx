import { PillarSidebar } from "./PillarSidebar";
import { PillarBottomNav } from "./PillarBottomNav";

/*
  PillarLayout

  Main application shell layout.

  Structure:
  - Desktop: left sidebar navigation
  - Mobile: bottom navigation bar
  - Center: page content (children)

  This wraps every protected page like Cockpit, Reports, etc.
  Pure layout component — no state, no API, no Redux needed
*/

export function PillarLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      
      {/* Desktop Sidebar */}
      <PillarSidebar />

      {/* Main Page Content */}
      <main className="md:ml-20 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <PillarBottomNav />
    </div>
  );
}

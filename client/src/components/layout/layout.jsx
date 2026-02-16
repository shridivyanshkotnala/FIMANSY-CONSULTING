import { SidebarProvider } from "./sidebar/sidebar-provider";
import { Sidebar } from "./sidebar/sidebar";
import { SidebarTrigger } from "./sidebar/sidebar-trigger";


export default function Layout({ children }) {
  return (
    <SidebarProvider>
      <Sidebar>
        Sidebar Content
      </Sidebar>

      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}

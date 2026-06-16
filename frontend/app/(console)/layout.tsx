import { AppSidebar } from "@/components/shell/app-sidebar";
import { AuthGate } from "@/components/shell/auth-gate";
import { CommandPalette } from "@/components/shell/command-palette";
import { Topbar } from "@/components/shell/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Topbar />
          <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6">{children}</div>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    </AuthGate>
  );
}

import { AdminGate } from "@/components/shell/admin-gate";
import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { CommandPalette } from "@/components/shell/command-palette";
import { Topbar } from "@/components/shell/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <Topbar />
          <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6">{children}</div>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    </AdminGate>
  );
}

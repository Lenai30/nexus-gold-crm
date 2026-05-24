import { ReactNode, useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";
import NewLeadModal from "@/components/NewLeadModal";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background bg-premium-shell">
      <AppSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      {sidebarOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[256px]"}`}>
        <header className="sticky top-0 z-30 h-16 border-b border-border/80 bg-background/85 backdrop-blur-xl flex items-center justify-between gap-3 px-3 sm:px-6 shadow-sm">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 max-w-2xl"><SearchBar /></div>
          <NewLeadModal />
        </header>
        <main className="p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

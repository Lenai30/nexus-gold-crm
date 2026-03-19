import { ReactNode, useState, useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import SearchBar from "@/components/SearchBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(256);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const sidebar = document.querySelector("aside");
      if (sidebar) setSidebarWidth(sidebar.getBoundingClientRect().width);
    });
    const sidebar = document.querySelector("aside");
    if (sidebar) {
      setSidebarWidth(sidebar.getBoundingClientRect().width);
      observer.observe(sidebar, { attributes: true, attributeFilter: ["style"] });
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-6">
          <SearchBar />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
